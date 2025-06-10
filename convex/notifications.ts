import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { createClerkClient } from "@clerk/backend";

// 通知の種類
export type NotificationType = 
  | "task_created" 
  | "task_updated" 
  | "task_assigned" 
  | "task_completed" 
  | "task_commented"
  | "user_joined"
  | "user_left"
  | "conflict_detected"
  | "conflict_resolved";

// 通知優先度
export type NotificationPriority = "low" | "medium" | "high" | "urgent";

// 通知作成
export const createNotification = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    targetUserId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    priority: v.string(),
    relatedTaskId: v.optional(v.id("tasks")),
    relatedUserId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const notificationId = await ctx.db.insert("notifications", {
      workspaceId: args.workspaceId,
      targetUserId: args.targetUserId,
      senderUserId: identity.subject,
      type: args.type,
      title: args.title,
      message: args.message,
      priority: args.priority,
      relatedTaskId: args.relatedTaskId,
      relatedUserId: args.relatedUserId,
      metadata: args.metadata,
      isRead: false,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

// ワークスペースメンバーに一括通知
export const createBulkNotification = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    priority: v.string(),
    relatedTaskId: v.optional(v.id("tasks")),
    excludeUserId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    // ワークスペースを取得
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    // 除外ユーザーを除いたメンバー一覧
    const targetUsers = workspace.members.filter(
      memberId => memberId !== (args.excludeUserId || identity.subject)
    );

    // 各メンバーに通知を作成
    const notificationIds = await Promise.all(
      targetUsers.map(async (targetUserId) => {
        return await ctx.db.insert("notifications", {
          workspaceId: args.workspaceId,
          targetUserId,
          senderUserId: identity.subject,
          type: args.type,
          title: args.title,
          message: args.message,
          priority: args.priority,
          relatedTaskId: args.relatedTaskId,
          relatedUserId: args.relatedUserId,
          metadata: args.metadata,
          isRead: false,
          createdAt: Date.now(),
        });
      })
    );

    return notificationIds;
  },
});

// ユーザーの通知一覧取得
export const getUserNotifications = query({
  args: { 
    workspaceId: v.optional(v.id("workspaces")),
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { workspaceId, limit = 50, unreadOnly = false }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    let query = ctx.db
      .query("notifications")
      .withIndex("by_target_user", (q) => q.eq("targetUserId", identity.subject));

    if (workspaceId) {
      query = query.filter((q) => q.eq(q.field("workspaceId"), workspaceId));
    }

    if (unreadOnly) {
      query = query.filter((q) => q.eq(q.field("isRead"), false));
    }

    const notifications = await query
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// 通知を既読にマーク
export const markNotificationAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const notification = await ctx.db.get(notificationId);
    if (!notification || notification.targetUserId !== identity.subject) {
      throw new Error("通知が見つからないか、アクセス権限がありません");
    }

    await ctx.db.patch(notificationId, { isRead: true });
  },
});

// ワークスペースの全通知を既読にマーク
export const markAllNotificationsAsRead = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_target_user", (q) => q.eq("targetUserId", identity.subject))
      .filter((q) => 
        q.and(
          q.eq(q.field("workspaceId"), workspaceId),
          q.eq(q.field("isRead"), false)
        )
      )
      .collect();

    await Promise.all(
      unreadNotifications.map(notification =>
        ctx.db.patch(notification._id, { isRead: true })
      )
    );

    return unreadNotifications.length;
  },
});

// 未読通知数を取得
export const getUnreadNotificationCount = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    let query = ctx.db
      .query("notifications")
      .withIndex("by_target_user", (q) => q.eq("targetUserId", identity.subject))
      .filter((q) => q.eq(q.field("isRead"), false));

    if (workspaceId) {
      query = query.filter((q) => q.eq(q.field("workspaceId"), workspaceId));
    }

    const unreadNotifications = await query.collect();
    return unreadNotifications.length;
  },
});

// ユーザー情報付き通知を取得
export const getNotificationsWithUserInfo = action({
  args: { 
    workspaceId: v.optional(v.id("workspaces")),
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    // 通知を取得
    const notifications = await ctx.runQuery(api.notifications.getUserNotifications, args);

    if (notifications.length === 0) {
      return [];
    }

    // Clerkからユーザー情報を取得
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const userIds = Array.from(new Set([
      ...notifications.map(n => n.senderUserId),
      ...notifications.map(n => n.relatedUserId).filter(Boolean),
    ])) as string[];

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

    // 通知にユーザー情報を追加
    return notifications.map(notification => ({
      ...notification,
      senderUser: userInfoMap.get(notification.senderUserId),
      relatedUser: notification.relatedUserId ? userInfoMap.get(notification.relatedUserId) : null,
    }));
  },
});

// タスク関連の通知を自動作成
export const createTaskNotification = mutation({
  args: {
    taskId: v.id("tasks"),
    workspaceId: v.id("workspaces"),
    type: v.string(),
    actionUserId: v.string(),
    taskTitle: v.string(),
    assigneeId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { taskId, workspaceId, type, actionUserId, taskTitle, assigneeId, metadata } = args;

    let title = "";
    let message = "";
    let priority: NotificationPriority = "medium";
    let targetUsers: string[] = [];

    // ワークスペースを取得
    const workspace = await ctx.db.get(workspaceId);
    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    switch (type) {
      case "task_created":
        title = "新しいタスクが作成されました";
        message = `${taskTitle} が作成されました`;
        priority = "medium";
        targetUsers = workspace.members.filter(id => id !== actionUserId);
        break;

      case "task_updated":
        title = "タスクが更新されました";
        message = `${taskTitle} が更新されました`;
        priority = "low";
        targetUsers = workspace.members.filter(id => id !== actionUserId);
        break;

      case "task_assigned":
        title = "タスクが割り当てられました";
        message = `${taskTitle} があなたに割り当てられました`;
        priority = "high";
        targetUsers = assigneeId ? [assigneeId] : [];
        break;

      case "task_completed":
        title = "タスクが完了しました";
        message = `${taskTitle} が完了しました`;
        priority = "medium";
        targetUsers = workspace.members.filter(id => id !== actionUserId);
        break;

      default:
        return;
    }

    // 各ターゲットユーザーに通知を作成
    const notificationIds = await Promise.all(
      targetUsers.map(async (targetUserId) => {
        return await ctx.db.insert("notifications", {
          workspaceId,
          targetUserId,
          senderUserId: actionUserId,
          type,
          title,
          message,
          priority,
          relatedTaskId: taskId,
          metadata,
          isRead: false,
          createdAt: Date.now(),
        });
      })
    );

    return notificationIds;
  },
});

// 古い通知をクリーンアップ
export const cleanupOldNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    // 30日以上前の既読通知を削除
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const oldNotifications = await ctx.db
      .query("notifications")
      .filter((q) => 
        q.and(
          q.lt(q.field("createdAt"), thirtyDaysAgo),
          q.eq(q.field("isRead"), true)
        )
      )
      .collect();

    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
    }

    return { cleaned: oldNotifications.length };
  },
});

// リアルタイムアクティビティフィード
export const getWorkspaceActivityFeed = query({
  args: { 
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { workspaceId, limit = 50 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    // タスクアクティビティを取得
    const activities = await ctx.db
      .query("taskActivities")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .order("desc")
      .take(limit);

    return activities;
  },
});

// ユーザー情報付きアクティビティフィード
export const getActivityFeedWithUserInfo = action({
  args: { 
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    // アクティビティを取得
    const activities = await ctx.runQuery(api.notifications.getWorkspaceActivityFeed, args);

    if (activities.length === 0) {
      return [];
    }

    // Clerkからユーザー情報を取得
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const userIds = Array.from(new Set(activities.map(a => a.userId)));
    const taskIds = Array.from(new Set(activities.map(a => a.taskId)));

    const userInfoMap = new Map();
    const taskInfoMap = new Map();

    // ユーザー情報を取得
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

    // タスク情報を取得
    for (const taskId of taskIds) {
      try {
        const task = await ctx.runQuery(api.tasks.getTask, { taskId });
        if (task) {
          taskInfoMap.set(taskId, task);
        }
      } catch (error) {
        console.error(`タスク情報の取得に失敗: ${taskId}`, error);
      }
    }

    // アクティビティにユーザー情報とタスク情報を追加
    return activities.map(activity => ({
      ...activity,
      user: userInfoMap.get(activity.userId),
      task: taskInfoMap.get(activity.taskId),
    }));
  },
});