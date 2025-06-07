import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ワークスペースのタスク一覧を取得
export const getWorkspaceTasks = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const tasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("workspaceId"), workspaceId))
      .order("asc")
      .collect();

    return tasks;
  },
});

// 新しいタスクを作成
export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    workspaceId: v.id("workspaces"),
    assigneeId: v.optional(v.string()),
    deadline: v.optional(v.string()),
    priority: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, ...taskData } = args;

    // ワークスペースへのアクセス権をチェック
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    if (!workspace.members.includes(userId) && workspace.ownerId !== userId) {
      throw new Error("このワークスペースにタスクを作成する権限がありません");
    }

    // 最大のorder値を取得して+1
    const existingTasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("workspaceId"), args.workspaceId))
      .collect();

    const maxOrder = Math.max(...existingTasks.map((task) => task.order), 0);

    const taskId = await ctx.db.insert("tasks", {
      ...taskData,
      order: maxOrder + 1,
    });

    // タスク作成のアクティビティを記録
    await ctx.db.insert("taskActivities", {
      workspaceId: args.workspaceId,
      userId,
      taskId,
      action: "created",
      timestamp: Date.now(),
    });

    return taskId;
  },
});

// タスクを更新
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      assigneeId: v.optional(v.string()),
      deadline: v.optional(v.string()),
      priority: v.optional(v.string()),
    }),
    userId: v.string(),
  },
  handler: async (ctx, { taskId, updates, userId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) {
      throw new Error("タスクが見つかりません");
    }

    // ワークスペースへのアクセス権をチェック
    const workspace = await ctx.db.get(task.workspaceId);
    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    if (!workspace.members.includes(userId) && workspace.ownerId !== userId) {
      throw new Error("このタスクを更新する権限がありません");
    }

    await ctx.db.patch(taskId, updates);

    // タスク更新のアクティビティを記録
    await ctx.db.insert("taskActivities", {
      workspaceId: task.workspaceId,
      userId,
      taskId,
      action: "updated",
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// タスクを削除
export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.string(),
  },
  handler: async (ctx, { taskId, userId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) {
      throw new Error("タスクが見つかりません");
    }

    // ワークスペースへのアクセス権をチェック
    const workspace = await ctx.db.get(task.workspaceId);
    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    if (!workspace.members.includes(userId) && workspace.ownerId !== userId) {
      throw new Error("このタスクを削除する権限がありません");
    }

    // 関連するアクティビティを削除
    const activities = await ctx.db
      .query("taskActivities")
      .filter((q) => q.eq(q.field("taskId"), taskId))
      .collect();

    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    // タスクを削除
    await ctx.db.delete(taskId);

    return { success: true };
  },
});

// タスクの順序を更新
export const updateTaskOrder = mutation({
  args: {
    taskId: v.id("tasks"),
    newOrder: v.number(),
    userId: v.string(),
  },
  handler: async (ctx, { taskId, newOrder, userId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) {
      throw new Error("タスクが見つかりません");
    }

    // ワークスペースへのアクセス権をチェック
    const workspace = await ctx.db.get(task.workspaceId);
    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    if (!workspace.members.includes(userId) && workspace.ownerId !== userId) {
      throw new Error("このタスクを更新する権限がありません");
    }

    await ctx.db.patch(taskId, { order: newOrder });

    return { success: true };
  },
});

// ワークスペースのアクティビティを取得
export const getWorkspaceActivities = query({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { workspaceId, limit = 10 }) => {
    const activities = await ctx.db
      .query("taskActivities")
      .filter((q) => q.eq(q.field("workspaceId"), workspaceId))
      .order("desc")
      .take(limit);

    // タスク情報も一緒に取得
    const activitiesWithTasks = await Promise.all(
      activities.map(async (activity) => {
        const task = await ctx.db.get(activity.taskId);
        return {
          ...activity,
          task,
        };
      })
    );

    return activitiesWithTasks;
  },
});
