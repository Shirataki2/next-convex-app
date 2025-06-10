import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

describe("通知システム", () => {
  test("通知の作成", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2"],
      });
    });

    // 通知を作成
    const notificationId = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.notifications.createNotification(ctx, {
        workspaceId,
        targetUserId: "user2",
        type: "task_created",
        title: "新しいタスクが作成されました",
        message: "テストタスクが作成されました",
        priority: "medium",
      });
    });

    // 通知が作成されたことを確認
    const notification = await t.run(async (ctx) => {
      return await ctx.db.get(notificationId);
    });

    expect(notification).toBeDefined();
    expect(notification?.targetUserId).toBe("user2");
    expect(notification?.senderUserId).toBe("user1");
    expect(notification?.type).toBe("task_created");
    expect(notification?.isRead).toBe(false);
  });

  test("一括通知の作成", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2", "user3", "user4"],
      });
    });

    // 一括通知を作成
    const notificationIds = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.notifications.createBulkNotification(ctx, {
        workspaceId,
        type: "user_joined",
        title: "新しいメンバーが参加しました",
        message: "ワークスペースに新しいメンバーが参加しました",
        priority: "low",
        excludeUserId: "user1", // 送信者は除外
      });
    });

    // 3人（user2, user3, user4）に通知が作成されたことを確認
    expect(notificationIds).toHaveLength(3);

    // 実際の通知を確認
    const notifications = await t.run(async (ctx) => {
      return await ctx.db.query("notifications").collect();
    });

    expect(notifications).toHaveLength(3);
    expect(notifications.every((n) => n.senderUserId === "user1")).toBe(true);
    expect(notifications.every((n) => n.type === "user_joined")).toBe(true);
  });

  test("ユーザーの通知一覧取得", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2"],
      });
    });

    // 複数の通知を作成
    await t.run(async (ctx) => {
      await ctx.db.insert("notifications", {
        workspaceId,
        targetUserId: "user2",
        senderUserId: "user1",
        type: "task_created",
        title: "タスク1が作成されました",
        message: "テストタスク1が作成されました",
        priority: "medium",
        isRead: false,
        createdAt: Date.now() - 3600000, // 1時間前
      });

      await ctx.db.insert("notifications", {
        workspaceId,
        targetUserId: "user2",
        senderUserId: "user1",
        type: "task_updated",
        title: "タスク2が更新されました",
        message: "テストタスク2が更新されました",
        priority: "low",
        isRead: true,
        createdAt: Date.now() - 1800000, // 30分前
      });

      await ctx.db.insert("notifications", {
        workspaceId,
        targetUserId: "user2",
        senderUserId: "user1",
        type: "task_assigned",
        title: "タスクが割り当てられました",
        message: "新しいタスクが割り当てられました",
        priority: "high",
        isRead: false,
        createdAt: Date.now(), // 現在
      });
    });

    // user2の通知一覧を取得
    const notifications = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user2",
          email: "user2@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.notifications.getUserNotifications(ctx, {
        workspaceId,
      });
    });

    expect(notifications).toHaveLength(3);

    // 新しい順にソートされていることを確認
    expect(notifications[0].type).toBe("task_assigned");
    expect(notifications[1].type).toBe("task_updated");
    expect(notifications[2].type).toBe("task_created");

    // 未読のみフィルター
    const unreadNotifications = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user2",
          email: "user2@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.notifications.getUserNotifications(ctx, {
        workspaceId,
        unreadOnly: true,
      });
    });

    expect(unreadNotifications).toHaveLength(2);
    expect(unreadNotifications.every((n) => !n.isRead)).toBe(true);
  });

  test("通知の既読マーク", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースと通知を作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2"],
      });
    });

    const notificationId: Id<"notifications"> = await t.run(async (ctx) => {
      return await ctx.db.insert("notifications", {
        workspaceId,
        targetUserId: "user2",
        senderUserId: "user1",
        type: "task_created",
        title: "新しいタスクが作成されました",
        message: "テストタスクが作成されました",
        priority: "medium",
        isRead: false,
        createdAt: Date.now(),
      });
    });

    // 通知を既読にマーク
    await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user2",
          email: "user2@example.com",
        }),
      };
      ctx.auth = mockAuth;

      await api.notifications.markNotificationAsRead(ctx, { notificationId });
    });

    // 既読になったことを確認
    const notification = await t.run(async (ctx) => {
      return await ctx.db.get(notificationId);
    });

    expect(notification?.isRead).toBe(true);
  });

  test("全通知の既読マーク", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2"],
      });
    });

    // 複数の未読通知を作成
    await t.run(async (ctx) => {
      await ctx.db.insert("notifications", {
        workspaceId,
        targetUserId: "user2",
        senderUserId: "user1",
        type: "task_created",
        title: "通知1",
        message: "メッセージ1",
        priority: "medium",
        isRead: false,
        createdAt: Date.now(),
      });

      await ctx.db.insert("notifications", {
        workspaceId,
        targetUserId: "user2",
        senderUserId: "user1",
        type: "task_updated",
        title: "通知2",
        message: "メッセージ2",
        priority: "low",
        isRead: false,
        createdAt: Date.now(),
      });
    });

    // 全通知を既読にマーク
    const markedCount = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user2",
          email: "user2@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.notifications.markAllNotificationsAsRead(ctx, {
        workspaceId,
      });
    });

    expect(markedCount).toBe(2);

    // 全ての通知が既読になったことを確認
    const notifications = await t.run(async (ctx) => {
      return await ctx.db
        .query("notifications")
        .filter((q) => q.eq(q.field("targetUserId"), "user2"))
        .collect();
    });

    expect(notifications.every((n) => n.isRead)).toBe(true);
  });

  test("未読通知数の取得", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2"],
      });
    });

    // 通知を作成（未読2件、既読1件）
    await t.run(async (ctx) => {
      await ctx.db.insert("notifications", {
        workspaceId,
        targetUserId: "user2",
        senderUserId: "user1",
        type: "task_created",
        title: "未読通知1",
        message: "メッセージ1",
        priority: "medium",
        isRead: false,
        createdAt: Date.now(),
      });

      await ctx.db.insert("notifications", {
        workspaceId,
        targetUserId: "user2",
        senderUserId: "user1",
        type: "task_updated",
        title: "未読通知2",
        message: "メッセージ2",
        priority: "low",
        isRead: false,
        createdAt: Date.now(),
      });

      await ctx.db.insert("notifications", {
        workspaceId,
        targetUserId: "user2",
        senderUserId: "user1",
        type: "task_assigned",
        title: "既読通知",
        message: "メッセージ3",
        priority: "high",
        isRead: true,
        createdAt: Date.now(),
      });
    });

    // 未読通知数を取得
    const unreadCount = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user2",
          email: "user2@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.notifications.getUnreadNotificationCount(ctx, {
        workspaceId,
      });
    });

    expect(unreadCount).toBe(2);
  });

  test("タスク通知の自動作成", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースとタスクを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2", "user3"],
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

    // タスク作成通知を作成
    await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      await api.notifications.createTaskNotification(ctx, {
        taskId,
        workspaceId,
        type: "task_created",
        actionUserId: "user1",
        taskTitle: "テストタスク",
      });
    });

    // 通知が作成者以外のメンバーに送信されたことを確認
    const notifications = await t.run(async (ctx) => {
      return await ctx.db.query("notifications").collect();
    });

    expect(notifications).toHaveLength(2); // user2とuser3に送信
    expect(notifications.every((n) => n.senderUserId === "user1")).toBe(true);
    expect(notifications.every((n) => n.type === "task_created")).toBe(true);
    expect(notifications.every((n) => n.relatedTaskId === taskId)).toBe(true);

    const targetUserIds = notifications.map((n) => n.targetUserId).sort();
    expect(targetUserIds).toEqual(["user2", "user3"]);
  });

  test("アクティビティフィードの取得", async () => {
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

    // アクティビティを作成
    await t.run(async (ctx) => {
      await ctx.db.insert("taskActivities", {
        workspaceId,
        userId: "user1",
        taskId,
        action: "created",
        timestamp: Date.now() - 3600000, // 1時間前
      });

      await ctx.db.insert("taskActivities", {
        workspaceId,
        userId: "user2",
        taskId,
        action: "updated",
        timestamp: Date.now(), // 現在
      });
    });

    // アクティビティフィードを取得
    const activities = await t.run(async (ctx) => {
      const mockAuth = {
        getUserIdentity: async () => ({
          subject: "user1",
          email: "user1@example.com",
        }),
      };
      ctx.auth = mockAuth;

      return await api.notifications.getWorkspaceActivityFeed(ctx, {
        workspaceId,
      });
    });

    expect(activities).toHaveLength(2);

    // 新しい順にソートされていることを確認
    expect(activities[0].action).toBe("updated");
    expect(activities[1].action).toBe("created");
  });

  test("古い通知のクリーンアップ", async () => {
    const t = convexTest(schema);

    // テスト用ワークスペースを作成
    const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
      return await ctx.db.insert("workspaces", {
        name: "テストワークスペース",
        ownerId: "user1",
        members: ["user1", "user2"],
      });
    });

    // 古い既読通知を作成（31日前）
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    await t.run(async (ctx) => {
      await ctx.db.insert("notifications", {
        workspaceId,
        targetUserId: "user2",
        senderUserId: "user1",
        type: "task_created",
        title: "古い通知",
        message: "削除される通知",
        priority: "low",
        isRead: true,
        createdAt: thirtyOneDaysAgo,
      });

      // 新しい通知も作成
      await ctx.db.insert("notifications", {
        workspaceId,
        targetUserId: "user2",
        senderUserId: "user1",
        type: "task_updated",
        title: "新しい通知",
        message: "残る通知",
        priority: "medium",
        isRead: false,
        createdAt: Date.now(),
      });
    });

    // クリーンアップを実行
    const cleanupResult = await t.run(async (ctx) => {
      return await api.notifications.cleanupOldNotifications(ctx, {});
    });

    expect(cleanupResult.cleaned).toBe(1);

    // 新しい通知のみ残っていることを確認
    const remainingNotifications = await t.run(async (ctx) => {
      return await ctx.db.query("notifications").collect();
    });

    expect(remainingNotifications).toHaveLength(1);
    expect(remainingNotifications[0].title).toBe("新しい通知");
  });
});
