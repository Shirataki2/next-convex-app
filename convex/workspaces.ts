import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ユーザーが所属するワークスペース一覧を取得
export const getUserWorkspaces = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const workspaces = await ctx.db
      .query("workspaces")
      .filter((q) =>
        q.or(q.eq(q.field("ownerId"), userId), q.eq(q.field("members"), userId))
      )
      .collect();

    return workspaces;
  },
});

// 新しいワークスペースを作成
export const createWorkspace = mutation({
  args: {
    name: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, { name, ownerId }) => {
    const workspaceId = await ctx.db.insert("workspaces", {
      name,
      ownerId,
      members: [ownerId], // オーナーはデフォルトでメンバーに含める
    });

    return workspaceId;
  },
});

// ワークスペース情報を取得
export const getWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const workspace = await ctx.db.get(workspaceId);
    return workspace;
  },
});

// ワークスペース名を更新
export const updateWorkspaceName = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { workspaceId, name, userId }) => {
    const workspace = await ctx.db.get(workspaceId);

    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    // オーナーのみが編集可能
    if (workspace.ownerId !== userId) {
      throw new Error("ワークスペースを編集する権限がありません");
    }

    await ctx.db.patch(workspaceId, { name });
    return { success: true };
  },
});

// ワークスペースにメンバーを追加
export const addMemberToWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    memberId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { workspaceId, memberId, userId }) => {
    const workspace = await ctx.db.get(workspaceId);

    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    // オーナーのみが追加可能
    if (workspace.ownerId !== userId) {
      throw new Error("メンバーを追加する権限がありません");
    }

    // 既にメンバーに含まれているかチェック
    if (workspace.members.includes(memberId)) {
      throw new Error("ユーザーは既にメンバーです");
    }

    const updatedMembers = [...workspace.members, memberId];
    await ctx.db.patch(workspaceId, { members: updatedMembers });

    return { success: true };
  },
});

// ワークスペースからメンバーを削除
export const removeMemberFromWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    memberId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { workspaceId, memberId, userId }) => {
    const workspace = await ctx.db.get(workspaceId);

    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    // オーナーのみが削除可能（オーナー自身は削除不可）
    if (workspace.ownerId !== userId) {
      throw new Error("メンバーを削除する権限がありません");
    }

    if (workspace.ownerId === memberId) {
      throw new Error("オーナーは削除できません");
    }

    const updatedMembers = workspace.members.filter((id) => id !== memberId);
    await ctx.db.patch(workspaceId, { members: updatedMembers });

    return { success: true };
  },
});

// ワークスペースを削除
export const deleteWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
  },
  handler: async (ctx, { workspaceId, userId }) => {
    const workspace = await ctx.db.get(workspaceId);

    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    // オーナーのみが削除可能
    if (workspace.ownerId !== userId) {
      throw new Error("ワークスペースを削除する権限がありません");
    }

    // 関連するタスクも削除
    const tasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("workspaceId"), workspaceId))
      .collect();

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    // 関連するアクティビティも削除
    const activities = await ctx.db
      .query("taskActivities")
      .filter((q) => q.eq(q.field("workspaceId"), workspaceId))
      .collect();

    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    // ワークスペースを削除
    await ctx.db.delete(workspaceId);

    return { success: true };
  },
});
