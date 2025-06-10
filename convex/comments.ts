import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { createClerkClient } from "@clerk/backend";

export interface CommentWithUser extends Doc<"taskComments"> {
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    username: string | null;
    emailAddress: string | null;
  };
}

// コメントの作成
export const createComment = mutation({
  args: {
    taskId: v.id("tasks"),
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { taskId, workspaceId, userId, content } = args;

    // タスクの存在確認
    const task = await ctx.db.get(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    // コメントを作成
    const commentId = await ctx.db.insert("taskComments", {
      taskId,
      workspaceId,
      userId,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isEdited: false,
    });

    // アクティビティを記録
    await ctx.db.insert("taskActivities", {
      workspaceId,
      userId,
      taskId,
      action: "comment_added",
      timestamp: Date.now(),
    });

    // 通知を作成（タスクの担当者とタスク作成者に通知）
    const workspace = await ctx.db.get(workspaceId);
    if (workspace) {
      const notificationTargets = new Set<string>();
      
      // タスクの担当者に通知
      if (task.assigneeId && task.assigneeId !== userId) {
        notificationTargets.add(task.assigneeId);
      }
      
      // ワークスペースのオーナーに通知（自分以外）
      if (workspace.ownerId !== userId) {
        notificationTargets.add(workspace.ownerId);
      }

      // 通知を作成
      for (const targetUserId of notificationTargets) {
        await ctx.db.insert("notifications", {
          workspaceId,
          targetUserId,
          senderUserId: userId,
          type: "comment_added",
          title: "新しいコメント",
          message: `${task.title}に新しいコメントが追加されました`,
          priority: "medium",
          relatedTaskId: taskId,
          metadata: { commentId },
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    return commentId;
  },
});

// タスクのコメント一覧を取得する内部query
export const getTaskCommentsInternal = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("taskComments")
      .withIndex("by_task_created", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();
    return comments;
  },
});

// タスクのコメント一覧を取得（ユーザー情報付き）
export const getTaskComments = action({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args): Promise<CommentWithUser[]> => {
    const { taskId } = args;

    // コメントを取得
    const comments = await ctx.runQuery(api.comments.getTaskCommentsInternal, { taskId });

    // ユーザー情報を取得
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    const userIds = [...new Set(comments.map((comment: Doc<"taskComments">) => comment.userId))];
    const userPromises = userIds.map((userId) =>
      clerk.users.getUser(userId).catch(() => null)
    );
    const users = await Promise.all(userPromises);

    const userMap = new Map(
      users
        .filter((user): user is NonNullable<typeof user> => user !== null)
        .map((user) => [
          user.id,
          {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
            username: user.username,
            emailAddress: user.emailAddresses?.[0]?.emailAddress || null,
          },
        ])
    );

    // コメントにユーザー情報を付加
    return comments.map((comment: Doc<"taskComments">) => ({
      ...comment,
      user: userMap.get(comment.userId),
    }));
  },
});

// コメントの更新
export const updateComment = mutation({
  args: {
    commentId: v.id("taskComments"),
    content: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { commentId, content, userId } = args;

    // コメントの存在確認と権限チェック
    const comment = await ctx.db.get(commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== userId) {
      throw new Error("Unauthorized: You can only edit your own comments");
    }

    // コメントを更新
    await ctx.db.patch(commentId, {
      content,
      updatedAt: Date.now(),
      isEdited: true,
    });

    return commentId;
  },
});

// コメントの削除
export const deleteComment = mutation({
  args: {
    commentId: v.id("taskComments"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { commentId, userId } = args;

    // コメントの存在確認と権限チェック
    const comment = await ctx.db.get(commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // コメント作成者またはワークスペースオーナーのみ削除可能
    const workspace = await ctx.db.get(comment.workspaceId);
    if (comment.userId !== userId && workspace?.ownerId !== userId) {
      throw new Error("Unauthorized: You cannot delete this comment");
    }

    // アクティビティを記録
    await ctx.db.insert("taskActivities", {
      workspaceId: comment.workspaceId,
      userId,
      taskId: comment.taskId,
      action: "comment_deleted",
      timestamp: Date.now(),
    });

    // コメントを削除
    await ctx.db.delete(commentId);

    return { success: true };
  },
});

// コメント数を取得
export const getCommentCount = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("taskComments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    
    return comments.length;
  },
});