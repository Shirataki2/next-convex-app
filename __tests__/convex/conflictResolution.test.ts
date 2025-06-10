import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { test, describe, expect } from "vitest";

describe("競合解決システム", () => {
  test("同時編集競合の検出", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースとタスクを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2"],
      });
    });

    const taskId: Id<"tasks"> = await t.run(async (ctx) => {
      return await ctx.db.insert("tasks", {
        title: "テストタスク",
        description: "テスト用のタスクです",
        status: "todo",
        workspaceId,
        priority: "medium",
        order: 1,
      });
    });

    // user1がタスクを編集開始（ロック設定）
    await t.run(async (ctx) => {
      await ctx.db.insert("taskLocks", {
        taskId,
        userId: "user1",
        workspaceId,
        lockedAt: Date.now(),
        lockType: "editing",
      });
    });

    // user2が同じタスクを編集しようとして競合チェック
    const conflictResult = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user2",
          email: "user2@example.com",
          tokenIdentifier: "mockTokenIdentifier",
          issuer: "mockIssuer",
        }),
      };
      ctx.auth = mockAuth;

      return await api.conflictResolution.checkForConflicts(ctx, {
        taskId,
        workspaceId,
        expectedVersion: 1,
        proposedChanges: { title: "更新されたタイトル" },
      });
    });

    expect(conflictResult.hasConflict).toBe(true);
    expect(conflictResult.conflictType).toBe("simultaneous_edit");
    expect(conflictResult.conflictingUsers).toContain("user1");
  });

  test("古いデータ競合の検出", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースとタスクを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1"],
      });
    });

    const taskId: Id<"tasks"> = await t.run(async (ctx) => {
      return await ctx.db.insert("tasks", {
        title: "テストタスク",
        description: "テスト用のタスクです",
        status: "todo",
        workspaceId,
        priority: "medium",
        order: 1,
      });
    });

    // タスクアクティビティを複数追加（バージョンを上げる）
    await t.run(async (ctx) => {
      await ctx.db.insert("taskActivities", {
        workspaceId,
        userId: "user1",
        taskId,
        action: "update",
        timestamp: Date.now() - 1000,
      });
      await ctx.db.insert("taskActivities", {
        workspaceId,
        userId: "user1",
        taskId,
        action: "update",
        timestamp: Date.now(),
      });
    });

    // 古いバージョンで更新しようとして競合チェック
    const conflictResult = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.conflictResolution.checkForConflicts(ctx, {
        taskId,
        workspaceId,
        expectedVersion: 0, // 古いバージョン
        proposedChanges: { title: "更新されたタイトル" },
      });
    });

    expect(conflictResult.hasConflict).toBe(true);
    expect(conflictResult.conflictType).toBe("stale_data");
  });

  test("競合の解決 - 強制保存", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースとタスクを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2"],
      });
    });

    const taskId: Id<"tasks"> = await t.run(async (ctx) => {
      return await ctx.db.insert("tasks", {
        title: "原文タイトル",
        description: "テスト用のタスクです",
        status: "todo",
        workspaceId,
        priority: "medium",
        order: 1,
      });
    });

    // 競合を作成
    const conflictId = "test_conflict_123";
    await t.run(async (ctx) => {
      await ctx.db.insert("taskConflicts", {
        conflictId,
        taskId,
        workspaceId,
        conflictType: "simultaneous_edit",
        initiatingUserId: "user1",
        conflictingUserId: "user2",
        timestamp: Date.now(),
        isResolved: false,
        initiatingVersion: 1,
        conflictingVersion: 2,
        metadata: {
          initiatingChanges: { title: "user1の変更" },
          conflictingChanges: { title: "user2の変更" },
        },
      });
    });

    // 競合を強制保存で解決
    await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      await api.conflictResolution.resolveConflict(ctx, {
        conflictId,
        resolution: "force_save",
      });
    });

    // 競合が解決されたことを確認
    const resolvedConflict = await t.run(async (ctx) => {
      return await ctx.db
        .query("taskConflicts")
        .filter((q) => q.eq(q.field("conflictId"), conflictId))
        .first();
    });

    expect(resolvedConflict?.isResolved).toBe(true);
    expect(resolvedConflict?.resolution).toBe("force_save");

    // タスクが更新されたことを確認
    const updatedTask = await t.run(async (ctx) => {
      return await ctx.db.get(taskId);
    });

    expect(updatedTask?.title).toBe("user1の変更");
  });

  test("競合チェック付きタスク更新", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースとタスクを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1"],
      });
    });

    const taskId: Id<"tasks"> = await t.run(async (ctx) => {
      return await ctx.db.insert("tasks", {
        title: "原文タイトル",
        description: "テスト用のタスクです",
        status: "todo",
        workspaceId,
        priority: "medium",
        order: 1,
      });
    });

    // 競合なしでの更新
    const updateResult = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.conflictResolution.updateTaskWithConflictCheck(ctx, {
        taskId,
        workspaceId,
        updates: { title: "更新されたタイトル" },
        expectedVersion: 0,
      });
    });

    expect(updateResult.success).toBe(true);

    // タスクが更新されたことを確認
    const updatedTask = await t.run(async (ctx) => {
      return await ctx.db.get(taskId);
    });

    expect(updatedTask?.title).toBe("更新されたタイトル");
  });

  test("ワークスペースの競合一覧取得", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースとタスクを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2"],
      });
    });

    const taskId: Id<"tasks"> = await t.run(async (ctx) => {
      return await ctx.db.insert("tasks", {
        title: "テストタスク",
        description: "テスト用のタスクです",
        status: "todo",
        workspaceId,
        priority: "medium",
        order: 1,
      });
    });

    // 複数の競合を作成
    await t.run(async (ctx) => {
      await ctx.db.insert("taskConflicts", {
        conflictId: "conflict_1",
        taskId,
        workspaceId,
        conflictType: "simultaneous_edit",
        initiatingUserId: "user1",
        conflictingUserId: "user2",
        timestamp: Date.now(),
        isResolved: false,
        initiatingVersion: 1,
        conflictingVersion: 2,
      });

      await ctx.db.insert("taskConflicts", {
        conflictId: "conflict_2",
        taskId,
        workspaceId,
        conflictType: "stale_data",
        initiatingUserId: "user2",
        conflictingUserId: "system",
        timestamp: Date.now(),
        isResolved: true,
        resolution: "reload",
        initiatingVersion: 1,
        conflictingVersion: 3,
      });
    });

    // アクティブな競合のみ取得
    const activeConflicts = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.conflictResolution.getWorkspaceConflicts(ctx, {
        workspaceId,
        includeResolved: false,
      });
    });

    expect(activeConflicts).toHaveLength(1);
    expect(activeConflicts[0].conflictId).toBe("conflict_1");

    // 解決済みを含む全競合を取得
    const allConflicts = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.conflictResolution.getWorkspaceConflicts(ctx, {
        workspaceId,
        includeResolved: true,
      });
    });

    expect(allConflicts).toHaveLength(2);
  });

  test("古い競合のクリーンアップ", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースとタスクを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1"],
      });
    });

    const taskId: Id<"tasks"> = await t.run(async (ctx) => {
      return await ctx.db.insert("tasks", {
        title: "テストタスク",
        description: "テスト用のタスクです",
        status: "todo",
        workspaceId,
        priority: "medium",
        order: 1,
      });
    });

    // 古い競合を作成（25時間前）
    const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000;
    await t.run(async (ctx) => {
      await ctx.db.insert("taskConflicts", {
        conflictId: "old_conflict",
        taskId,
        workspaceId,
        conflictType: "simultaneous_edit",
        initiatingUserId: "user1",
        conflictingUserId: "user2",
        timestamp: twentyFiveHoursAgo,
        isResolved: true,
        resolution: "force_save",
        initiatingVersion: 1,
        conflictingVersion: 2,
      });

      // 新しい競合も作成
      await ctx.db.insert("taskConflicts", {
        conflictId: "new_conflict",
        taskId,
        workspaceId,
        conflictType: "stale_data",
        initiatingUserId: "user1",
        conflictingUserId: "system",
        timestamp: Date.now(),
        isResolved: false,
        initiatingVersion: 2,
        conflictingVersion: 3,
      });
    });

    // クリーンアップを実行
    const cleanupResult = await t.run(async (ctx) => {
      return await api.conflictResolution.cleanupOldConflicts(ctx, {});
    });

    expect(cleanupResult.cleaned).toBe(1);

    // 新しい競合のみ残っていることを確認
    const remainingConflicts = await t.run(async (ctx) => {
      return await ctx.db.query("taskConflicts").collect();
    });

    expect(remainingConflicts).toHaveLength(1);
    expect(remainingConflicts[0].conflictId).toBe("new_conflict");
  });

  test("競合解決時のアクティビティログ", async () => {
    const t = convexTest(schema);

    // テスト用データを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1"],
      });
    });

    const taskId: Id<"tasks"> = await t.run(async (ctx) => {
      return await ctx.db.insert("tasks", {
        title: "テストタスク",
        status: "todo",
        workspaceId,
        priority: "medium",
        order: 1,
      });
    });

    const conflictId = "test_conflict_456";
    await t.run(async (ctx) => {
      await ctx.db.insert("taskConflicts", {
        conflictId,
        taskId,
        workspaceId,
        conflictType: "simultaneous_edit",
        initiatingUserId: "user1",
        conflictingUserId: "user2",
        timestamp: Date.now(),
        isResolved: false,
        initiatingVersion: 1,
        conflictingVersion: 2,
      });
    });

    // 競合を解決
    await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      await api.conflictResolution.resolveConflict(ctx, {
        conflictId,
        resolution: "merge",
      });
    });

    // アクティビティログが記録されたことを確認
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query("taskActivities")
        .filter((q) => q.eq(q.field("taskId"), taskId))
        .collect();
    });

    const conflictActivity = activities.find(
      (activity) => activity.action === "conflict_resolved_merge"
    );

    expect(conflictActivity).toBeDefined();
    expect(conflictActivity?.userId).toBe("user1");
  });
});
