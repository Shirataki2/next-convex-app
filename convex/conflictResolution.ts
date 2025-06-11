import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { createClerkClient } from "@clerk/backend";
import { api } from "./_generated/api";

// 競合の種類
export type ConflictType =
  | "simultaneous_edit"
  | "stale_data"
  | "permission_denied";

// 競合状態の定義
export interface TaskConflict {
  conflictId: string;
  taskId: Id<"tasks">;
  workspaceId: Id<"workspaces">;
  conflictType: ConflictType;
  initiatingUserId: string;
  conflictingUserId: string;
  timestamp: number;
  isResolved: boolean;
  resolution?: "force_save" | "merge" | "discard" | "reload";
  initiatingVersion: number;
  conflictingVersion: number;
  metadata?: {
    initiatingChanges: Record<string, any>;
    conflictingChanges: Record<string, any>;
  };
}

interface UserInfo {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  username?: string | null;
  emailAddress?: string | null;
}

interface ConflictWithUserInfo extends TaskConflict {
  initiatingUser?: UserInfo;
  conflictingUser?: UserInfo;
}

// タスク競合情報を追加するためのスキーマ拡張（実際にはschema.tsに追加する必要がある）
export const taskConflictSchema = {
  conflictId: v.string(),
  taskId: v.id("tasks"),
  workspaceId: v.id("workspaces"),
  conflictType: v.string(),
  initiatingUserId: v.string(),
  conflictingUserId: v.string(),
  timestamp: v.number(),
  isResolved: v.boolean(),
  resolution: v.optional(v.string()),
  initiatingVersion: v.number(),
  conflictingVersion: v.number(),
  metadata: v.optional(v.any()),
};

// タスク更新前の競合チェック
export const checkForConflicts = mutation({
  args: {
    taskId: v.id("tasks"),
    workspaceId: v.id("workspaces"),
    expectedVersion: v.number(),
    proposedChanges: v.any(),
  },
  handler: async (
    ctx,
    { taskId, workspaceId, expectedVersion, proposedChanges }
  ) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const userId = identity.subject;

    // 現在のタスク情報を取得
    const currentTask = await ctx.db.get(taskId);
    if (!currentTask) {
      throw new Error("タスクが見つかりません");
    }

    // タスクの現在のバージョンを確認（更新回数をバージョンとして使用）
    const taskActivities = await ctx.db
      .query("taskActivities")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .filter((q) => q.eq(q.field("taskId"), taskId))
      .collect();

    const currentVersion = taskActivities.length;

    // バージョンミスマッチ（古いデータでの更新）をチェック
    if (expectedVersion < currentVersion) {
      // 現在編集中の他のユーザーをチェック
      const currentLocks = await ctx.db
        .query("taskLocks")
        .withIndex("by_task", (q) => q.eq("taskId", taskId))
        .filter((q) =>
          q.and(
            q.neq(q.field("userId"), userId),
            q.eq(q.field("lockType"), "editing"),
            q.gte(q.field("lockedAt"), Date.now() - 5 * 60 * 1000) // 5分以内
          )
        )
        .collect();

      if (currentLocks.length > 0) {
        // 競合を記録
        const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await ctx.db.insert("taskConflicts", {
          conflictId,
          taskId,
          workspaceId,
          conflictType: "simultaneous_edit",
          initiatingUserId: userId,
          conflictingUserId: currentLocks[0].userId,
          timestamp: Date.now(),
          isResolved: false,
          initiatingVersion: expectedVersion,
          conflictingVersion: currentVersion,
          metadata: {
            initiatingChanges: proposedChanges,
            conflictingChanges: {}, // 実際の変更内容は別途取得
          },
        });

        return {
          hasConflict: true,
          conflictType: "simultaneous_edit" as ConflictType,
          conflictId,
          conflictingUsers: currentLocks.map((lock) => lock.userId),
          currentVersion,
          suggestedActions: [
            "reload", // 最新データを再読み込み
            "force_save", // 強制保存
            "merge", // 変更をマージ
          ],
        };
      } else {
        // 他に編集中のユーザーはいないが、データが古い
        const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await ctx.db.insert("taskConflicts", {
          conflictId,
          taskId,
          workspaceId,
          conflictType: "stale_data",
          initiatingUserId: userId,
          conflictingUserId: "system",
          timestamp: Date.now(),
          isResolved: false,
          initiatingVersion: expectedVersion,
          conflictingVersion: currentVersion,
          metadata: {
            initiatingChanges: proposedChanges,
            conflictingChanges: {},
          },
        });

        return {
          hasConflict: true,
          conflictType: "stale_data" as ConflictType,
          conflictId,
          currentVersion,
          suggestedActions: [
            "reload", // 最新データを再読み込み
            "force_save", // 強制保存
          ],
        };
      }
    }

    return {
      hasConflict: false,
      currentVersion,
    };
  },
});

// 競合の解決
export const resolveConflict = mutation({
  args: {
    conflictId: v.string(),
    resolution: v.string(), // "force_save" | "merge" | "discard" | "reload"
    mergedData: v.optional(v.any()),
  },
  handler: async (ctx, { conflictId, resolution, mergedData }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    // 競合情報を取得
    const conflict = await ctx.db
      .query("taskConflicts")
      .filter((q) => q.eq(q.field("conflictId"), conflictId))
      .first();

    if (!conflict) {
      throw new Error("競合情報が見つかりません");
    }

    if (conflict.isResolved) {
      throw new Error("この競合は既に解決されています");
    }

    // 解決処理
    switch (resolution) {
      case "force_save":
        // 強制保存：現在のユーザーの変更を適用
        if (conflict.metadata?.initiatingChanges) {
          await ctx.db.patch(
            conflict.taskId,
            conflict.metadata.initiatingChanges
          );
        }
        break;

      case "merge":
        // マージ：統合されたデータを保存
        if (mergedData) {
          await ctx.db.patch(conflict.taskId, mergedData);
        }
        break;

      case "discard":
        // 破棄：何もせず、競合のみ解決済みにマーク
        break;

      case "reload":
        // 再読み込み：最新データを取得（フロントエンド側で処理）
        break;

      default:
        throw new Error("無効な解決方法です");
    }

    // 競合を解決済みにマーク
    await ctx.db.patch(conflict._id, {
      isResolved: true,
      resolution: resolution as "force_save" | "merge" | "discard" | "reload",
    });

    // アクティビティログに記録
    await ctx.db.insert("taskActivities", {
      workspaceId: conflict.workspaceId,
      userId: identity.subject,
      taskId: conflict.taskId,
      action: `conflict_resolved_${resolution}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// ワークスペースの競合一覧を取得
export const getWorkspaceConflicts = query({
  args: {
    workspaceId: v.id("workspaces"),
    includeResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, { workspaceId, includeResolved = false }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    let conflictsQuery = ctx.db
      .query("taskConflicts")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId));

    if (!includeResolved) {
      conflictsQuery = conflictsQuery.filter((q) =>
        q.eq(q.field("isResolved"), false)
      );
    }

    const conflicts = await conflictsQuery.collect();

    // 最近の1時間以内の競合のみ返す（古い競合は自動的に無視）
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return conflicts.filter((conflict) => conflict.timestamp > oneHourAgo);
  },
});

// 特定のタスクの競合をチェック
export const getTaskConflicts = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const conflicts = await ctx.db
      .query("taskConflicts")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .filter((q) => q.eq(q.field("isResolved"), false))
      .collect();

    // 最近の30分以内の競合のみ返す
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    return conflicts.filter(
      (conflict) => conflict.timestamp > thirtyMinutesAgo
    );
  },
});

// ユーザー情報を含む競合情報を取得
export const getConflictsWithUserInfo = action({
  args: {
    workspaceId: v.id("workspaces"),
    includeResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, { workspaceId, includeResolved = false }): Promise<ConflictWithUserInfo[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("認証エラー: ユーザーのIdentityが取得できませんでした");
      return [];
    }

    // 競合情報を取得
    const conflicts: any[] = await ctx.runQuery(
      api.conflictResolution.getWorkspaceConflicts,
      {
        workspaceId,
        includeResolved,
      }
    );

    if (conflicts.length === 0) {
      return [];
    }

    // Clerkからユーザー情報を取得
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const userIds = Array.from(
      new Set([
        ...conflicts.map((c: any) => c.initiatingUserId),
        ...conflicts
          .map((c: any) => c.conflictingUserId)
          .filter((id: string) => id !== "system"),
      ])
    );

    const userInfoMap = new Map();

    for (const userId of userIds) {
      try {
        const user = await clerk.users.getUser(userId);
        userInfoMap.set(userId, {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          username: user.username,
          emailAddress: user.emailAddresses?.[0]?.emailAddress,
        });
      } catch (error) {
        console.error(`ユーザー情報の取得に失敗: ${userId}`, error);
        userInfoMap.set(userId, {
          id: userId,
          firstName: null,
          lastName: null,
          imageUrl: null,
          username: null,
          emailAddress: null,
        });
      }
    }

    // 競合情報にユーザー情報を追加
    return conflicts.map((conflict: any) => ({
      ...conflict,
      initiatingUser: userInfoMap.get(conflict.initiatingUserId),
      conflictingUser:
        conflict.conflictingUserId === "system"
          ? {
              id: "system",
              firstName: "システム",
              lastName: "",
              imageUrl: null,
              username: "system",
              emailAddress: null,
            }
          : userInfoMap.get(conflict.conflictingUserId),
    }));
  },
});

// 古い競合レコードをクリーンアップ
export const cleanupOldConflicts = mutation({
  args: {},
  handler: async (ctx) => {
    // 24時間以上前の競合レコードを削除
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    const oldConflicts = await ctx.db
      .query("taskConflicts")
      .filter((q) => q.lt(q.field("timestamp"), twentyFourHoursAgo))
      .collect();

    for (const conflict of oldConflicts) {
      await ctx.db.delete(conflict._id);
    }

    return { cleaned: oldConflicts.length };
  },
});

// タスク更新時のバージョン管理と競合回避
export const updateTaskWithConflictCheck = mutation({
  args: {
    taskId: v.id("tasks"),
    workspaceId: v.id("workspaces"),
    updates: v.any(),
    expectedVersion: v.number(),
    forceUpdate: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { taskId, workspaceId, updates, expectedVersion, forceUpdate = false }
  ) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const userId = identity.subject;

    if (!forceUpdate) {
      // 競合チェックを実行
      const conflictCheck = await ctx.runMutation(
        api.conflictResolution.checkForConflicts,
        {
          taskId,
          workspaceId,
          expectedVersion,
          proposedChanges: updates,
        }
      );

      if (conflictCheck.hasConflict) {
        throw new Error(
          JSON.stringify({
            type: "CONFLICT_DETECTED",
            conflict: conflictCheck,
          })
        );
      }
    }

    // タスクを更新
    await ctx.db.patch(taskId, updates);

    // アクティビティログに記録
    await ctx.db.insert("taskActivities", {
      workspaceId,
      userId,
      taskId,
      action: forceUpdate ? "force_update" : "update",
      timestamp: Date.now(),
    });

    return { success: true };
  },
});
