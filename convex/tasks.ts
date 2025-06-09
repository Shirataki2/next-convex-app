import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { createClerkClient } from "@clerk/backend";

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

// ユーザー情報の型定義
type AssigneeUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  username: string | null;
  emailAddress?: string;
} | null;

// ワークスペースメンバーの型定義（null不許可）
type WorkspaceMemberInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  username: string | null;
  emailAddress?: string;
};

// ユーザー情報付きタスクの型定義
type TaskWithUser = {
  assigneeUser: AssigneeUser;
} & any;

// ユーザー情報付きでワークスペースのタスク一覧を取得
export const getWorkspaceTasksWithUsers = action({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }): Promise<TaskWithUser[]> => {
    // 既存のクエリ関数を呼び出してタスクを取得
    const tasks: any[] = await ctx.runQuery(api.tasks.getWorkspaceTasks, {
      workspaceId,
    });

    // CLERK_SECRET_KEYがない場合は、ユーザー情報なしでタスクを返す
    if (!process.env.CLERK_SECRET_KEY) {
      console.warn(
        "CLERK_SECRET_KEY is not set. User information will not be fetched."
      );
      return tasks.map((task: any) => ({ ...task, assigneeUser: null }));
    }

    // ClerkClientを初期化
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // assigneeIdがあるタスクに対してユーザー情報を取得
    const tasksWithUsers: TaskWithUser[] = await Promise.all(
      tasks.map(async (task: any) => {
        if (!task.assigneeId) {
          return { ...task, assigneeUser: null };
        }

        try {
          // Clerk APIを呼び出してユーザー情報を取得
          const user = await clerk.users.getUser(task.assigneeId);
          return {
            ...task,
            assigneeUser: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              imageUrl: user.imageUrl,
              username: user.username,
              emailAddress: user.emailAddresses?.[0]?.emailAddress,
            },
          };
        } catch (error) {
          console.error(`Failed to fetch user ${task.assigneeId}:`, error);
          return { ...task, assigneeUser: null };
        }
      })
    );

    return tasksWithUsers;
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

    // 同じステータスの最大のorder値を取得して+1
    const existingTasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("workspaceId"), args.workspaceId))
      .filter((q) => q.eq(q.field("status"), args.status))
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
      order: v.optional(v.number()),
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

// ワークスペースメンバーのユーザー情報を取得
export const getWorkspaceMembers = action({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }): Promise<WorkspaceMemberInfo[]> => {
    // ワークスペース情報を取得
    const workspace: any = await ctx.runQuery(api.workspaces.getWorkspace, {
      workspaceId,
    });

    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    // CLERK_SECRET_KEYがない場合は、ユーザー情報なしで返す
    if (!process.env.CLERK_SECRET_KEY) {
      console.warn(
        "CLERK_SECRET_KEY is not set. User information will not be fetched."
      );
      const memberIds: string[] = [workspace.ownerId, ...workspace.members];
      return memberIds.map((memberId: string) => ({
        id: memberId,
        firstName: null,
        lastName: null,
        imageUrl: "",
        username: null,
        emailAddress: undefined,
      }));
    }

    // ClerkClientを初期化
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // オーナーとメンバーの重複を除去
    const allMemberIds = Array.from(
      new Set([workspace.ownerId, ...workspace.members])
    );

    // 各メンバーのユーザー情報を取得
    const membersWithUserInfo: WorkspaceMemberInfo[] = await Promise.all(
      allMemberIds.map(async (memberId) => {
        try {
          const user = await clerk.users.getUser(memberId);
          return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
            username: user.username,
            emailAddress: user.emailAddresses?.[0]?.emailAddress,
          };
        } catch (error) {
          console.error(`Failed to fetch user ${memberId}:`, error);
          return {
            id: memberId,
            firstName: null,
            lastName: null,
            imageUrl: "",
            username: null,
            emailAddress: undefined,
          };
        }
      })
    );

    return membersWithUserInfo;
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
