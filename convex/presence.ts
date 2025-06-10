import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { createClerkClient } from "@clerk/backend";

// プレゼンス状態を更新するmutation
export const updatePresence = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    status: v.string(),
    currentPage: v.optional(v.string()),
    isEditing: v.optional(v.id("tasks")),
  },
  handler: async (ctx, { workspaceId, status, currentPage, isEditing }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const userId = identity.subject;
    const now = Date.now();

    // 既存のプレゼンス情報を検索
    const existingPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspaceId).eq("userId", userId)
      )
      .first();

    if (existingPresence) {
      // 既存の情報を更新
      await ctx.db.patch(existingPresence._id, {
        status,
        lastSeen: now,
        currentPage,
        isEditing,
      });
    } else {
      // 新しいプレゼンス情報を作成
      await ctx.db.insert("userPresence", {
        userId,
        workspaceId,
        status,
        lastSeen: now,
        currentPage,
        isEditing,
      });
    }
  },
});

// ワークスペースのプレゼンス情報を取得するquery
export const getWorkspacePresence = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    // 最近のプレゼンス情報を取得（5分以内にアクティビティがあったユーザー）
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    const presenceList = await ctx.db
      .query("userPresence")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .filter((q) => q.gte(q.field("lastSeen"), fiveMinutesAgo))
      .collect();

    return presenceList;
  },
});

// ユーザー情報を含むプレゼンス情報を取得するaction
export const getWorkspacePresenceWithUsers = action({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }): Promise<any[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    // プレゼンス情報を取得
    const presenceList: any[] = await ctx.runQuery(api.presence.getWorkspacePresence, {
      workspaceId,
    });

    // Clerkからユーザー情報を取得
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const presenceWithUsers: any[] = await Promise.all(
      presenceList.map(async (presence: any) => {
        try {
          const user = await clerk.users.getUser(presence.userId);
          return {
            ...presence,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              imageUrl: user.imageUrl,
              username: user.username,
              emailAddress: user.emailAddresses?.[0]?.emailAddress,
            },
          };
        } catch (error) {
          console.error(`ユーザー情報の取得に失敗: ${presence.userId}`, error);
          return {
            ...presence,
            user: {
              id: presence.userId,
              firstName: null,
              lastName: null,
              imageUrl: null,
              username: null,
              emailAddress: null,
            },
          };
        }
      })
    );

    return presenceWithUsers;
  },
});

// タスクロックを設定するmutation
export const setTaskLock = mutation({
  args: {
    taskId: v.id("tasks"),
    workspaceId: v.id("workspaces"),
    lockType: v.string(),
  },
  handler: async (ctx, { taskId, workspaceId, lockType }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const userId = identity.subject;
    const now = Date.now();

    // 既存のロックを確認
    const existingLock = await ctx.db
      .query("taskLocks")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existingLock) {
      // 既存のロックを更新
      await ctx.db.patch(existingLock._id, {
        lockedAt: now,
        lockType,
      });
    } else {
      // 新しいロックを作成
      await ctx.db.insert("taskLocks", {
        taskId,
        userId,
        workspaceId,
        lockedAt: now,
        lockType,
      });
    }
  },
});

// タスクロックを解除するmutation
export const removeTaskLock = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, { taskId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const userId = identity.subject;

    // ユーザーのタスクロックを削除
    const existingLock = await ctx.db
      .query("taskLocks")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existingLock) {
      await ctx.db.delete(existingLock._id);
    }
  },
});

// ワークスペースのタスクロック情報を取得するquery
export const getWorkspaceTaskLocks = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    // 最近のロック情報を取得（5分以内）
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    const locks = await ctx.db
      .query("taskLocks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .filter((q) => q.gte(q.field("lockedAt"), fiveMinutesAgo))
      .collect();

    return locks;
  },
});

// 古いプレゼンス情報とロックをクリーンアップするmutation
export const cleanupOldPresence = mutation({
  args: {},
  handler: async (ctx) => {
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;

    // 古いプレゼンス情報を削除
    const oldPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_last_seen", (q) => q.lt("lastSeen", fifteenMinutesAgo))
      .collect();

    for (const presence of oldPresence) {
      await ctx.db.delete(presence._id);
    }

    // 古いタスクロックを削除
    const oldLocks = await ctx.db
      .query("taskLocks")
      .withIndex("by_locked_at", (q) => q.lt("lockedAt", fifteenMinutesAgo))
      .collect();

    for (const lock of oldLocks) {
      await ctx.db.delete(lock._id);
    }
  },
});

// ハートビート用のmutation（定期的にプレゼンス状態を更新）
export const heartbeat = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    currentPage: v.optional(v.string()),
  },
  handler: async (ctx, { workspaceId, currentPage }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return; // 認証されていない場合は何もしない
    }

    const userId = identity.subject;
    const now = Date.now();

    // プレゼンス情報を更新
    const existingPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspaceId).eq("userId", userId)
      )
      .first();

    if (existingPresence) {
      await ctx.db.patch(existingPresence._id, {
        status: "online",
        lastSeen: now,
        currentPage,
      });
    } else {
      await ctx.db.insert("userPresence", {
        userId,
        workspaceId,
        status: "online",
        lastSeen: now,
        currentPage,
      });
    }
  },
});
