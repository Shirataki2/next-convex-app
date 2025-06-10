import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

describe("プレゼンス機能", () => {
  test("プレゼンス状態の更新", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2"],
      });
    });

    // プレゼンス状態を更新
    await t.run(async (ctx) => {
      // 認証情報をモック
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      await api.presence.updatePresence(ctx, {
        workspaceId,
        status: "online",
        currentPage: "/workspace/test",
        isEditing: undefined,
      });
    });

    // プレゼンス情報を取得
    const presence = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.presence.getWorkspacePresence(ctx, { workspaceId });
    });

    expect(presence).toHaveLength(1);
    expect(presence[0].userId).toBe("user1");
    expect(presence[0].status).toBe("online");
    expect(presence[0].currentPage).toBe("/workspace/test");
  });

  test("タスクロックの設定と解除", async () => {
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

    // タスクロックを設定
    await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      await api.presence.setTaskLock(ctx, {
        taskId,
        workspaceId,
        lockType: "editing",
      });
    });

    // タスクロック情報を取得
    const locks = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.presence.getWorkspaceTaskLocks(ctx, { workspaceId });
    });

    expect(locks).toHaveLength(1);
    expect(locks[0].taskId).toBe(taskId);
    expect(locks[0].userId).toBe("user1");
    expect(locks[0].lockType).toBe("editing");

    // タスクロックを解除
    await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      await api.presence.removeTaskLock(ctx, { taskId });
    });

    // ロックが解除されたことを確認
    const locksAfterRemoval = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.presence.getWorkspaceTaskLocks(ctx, { workspaceId });
    });

    expect(locksAfterRemoval).toHaveLength(0);
  });

  test("古いプレゼンス情報のクリーンアップ", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2"],
      });
    });

    // 古いプレゼンス情報を挿入（16分前）
    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
    await t.run(async (ctx) => {
      await ctx.db.insert("userPresence", {
        userId: "user1",
        workspaceId,
        status: "online",
        lastSeen: sixteenMinutesAgo,
      });
    });

    // 現在のプレゼンス情報を挿入
    await t.run(async (ctx) => {
      await ctx.db.insert("userPresence", {
        userId: "user2",
        workspaceId,
        status: "online",
        lastSeen: Date.now(),
      });
    });

    // クリーンアップを実行
    await t.run(async (ctx) => {
      await api.presence.cleanupOldPresence(ctx, {});
    });

    // 古いプレゼンス情報が削除され、新しい情報のみ残っていることを確認
    const remainingPresence = await t.run(async (ctx) => {
      return await ctx.db.query("userPresence").collect();
    });

    expect(remainingPresence).toHaveLength(1);
    expect(remainingPresence[0].userId).toBe("user2");
  });

  test("ハートビート機能", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1"],
      });
    });

    // 初回ハートビート
    await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      await api.presence.heartbeat(ctx, {
        workspaceId,
        currentPage: "/workspace/test",
      });
    });

    // プレゼンス情報が作成されたことを確認
    const presence = await t.run(async (ctx) => {
      return await ctx.db.query("userPresence").collect();
    });

    expect(presence).toHaveLength(1);
    expect(presence[0].userId).toBe("user1");
    expect(presence[0].status).toBe("online");

    // 2回目のハートビート（更新）
    const firstLastSeen = presence[0].lastSeen;
    
    // 少し時間を置いてから再度ハートビート
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      await api.presence.heartbeat(ctx, {
        workspaceId,
        currentPage: "/workspace/test-updated",
      });
    });

    // プレゼンス情報が更新されたことを確認
    const updatedPresence = await t.run(async (ctx) => {
      return await ctx.db.query("userPresence").collect();
    });

    expect(updatedPresence).toHaveLength(1);
    expect(updatedPresence[0].lastSeen).toBeGreaterThan(firstLastSeen);
    expect(updatedPresence[0].currentPage).toBe("/workspace/test-updated");
  });

  test("複数ユーザーのプレゼンス管理", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2", "user3"],
      });
    });

    // 複数ユーザーのプレゼンス状態を設定
    for (const userId of ["user1", "user2", "user3"]) {
      await t.run(async (ctx) => {
        const mockAuth = {
          getUserIdentity: async () => ({
            subject: userId,
            email: `${userId}@example.com`,
          }),
        };
        ctx.auth = mockAuth;

        await api.presence.updatePresence(ctx, {
          workspaceId,
          status: userId === "user3" ? "away" : "online",
          currentPage: `/workspace/${userId}`,
        });
      });
    }

    // プレゼンス情報を取得
    const allPresence = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.presence.getWorkspacePresence(ctx, { workspaceId });
    });

    expect(allPresence).toHaveLength(3);
    
    const onlineUsers = allPresence.filter(p => p.status === "online");
    const awayUsers = allPresence.filter(p => p.status === "away");
    
    expect(onlineUsers).toHaveLength(2);
    expect(awayUsers).toHaveLength(1);
    expect(awayUsers[0].userId).toBe("user3");
  });
});