import { v } from "convex/values";
import { action, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { createClerkClient } from "@clerk/backend";
import { Id } from "./_generated/dataModel";
import { internal, api } from "./_generated/api";

// メッセージ送信
export const sendMessage = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    content: v.string(),
    fileIds: v.optional(v.array(v.id("chatFiles"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // ワークスペースのメンバーか確認
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const userId = identity.subject;
    if (!workspace.members.includes(userId) && workspace.ownerId !== userId) {
      throw new Error("Not a member of this workspace");
    }

    // メッセージを作成
    const messageId = await ctx.db.insert("messages", {
      workspaceId: args.workspaceId,
      userId,
      content: args.content,
      fileIds: args.fileIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isEdited: false,
    });

    // チャット通知を作成（メッセージ送信者以外の全メンバーに通知）
    const allMembers = [...workspace.members, workspace.ownerId].filter(
      (memberId) => memberId !== userId
    );

    for (const memberId of allMembers) {
      await ctx.db.insert("notifications", {
        workspaceId: args.workspaceId,
        targetUserId: memberId,
        senderUserId: userId,
        type: "message_sent",
        title: "新しいメッセージ",
        message: args.content.substring(0, 100) + (args.content.length > 100 ? "..." : ""),
        priority: "medium",
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return messageId;
  },
});

// メッセージ一覧取得（リアルタイム）
export const getMessages = query({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("認証エラー: メッセージ取得でユーザーのIdentityが取得できませんでした");
      return [];
    }

    // ワークスペースのメンバーか確認
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const userId = identity.subject;
    if (!workspace.members.includes(userId) && workspace.ownerId !== userId) {
      throw new Error("Not a member of this workspace");
    }

    // メッセージを取得
    const limit = args.limit || 100;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_workspace_created", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(limit);

    // 添付ファイル情報を取得
    const messagesWithFiles = await Promise.all(
      messages.map(async (message) => {
        let files = null;
        if (message.fileIds && message.fileIds.length > 0) {
          files = await Promise.all(
            message.fileIds.map(async (fileId) => {
              const file = await ctx.db.get(fileId);
              return file;
            })
          );
        }
        return {
          ...message,
          files: files?.filter(Boolean),
        };
      })
    );

    // 新しい順から古い順に並び替えて返す
    return messagesWithFiles.reverse();
  },
});

// Internal query for getting messages
export const getMessagesInternal = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_workspace_created", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(limit);

    // 添付ファイル情報を取得
    const messagesWithFiles = await Promise.all(
      messages.map(async (message) => {
        let files = null;
        if (message.fileIds && message.fileIds.length > 0) {
          files = await Promise.all(
            message.fileIds.map(async (fileId) => {
              const file = await ctx.db.get(fileId);
              if (file) {
                // ファイルURLを生成
                const url = await ctx.storage.getUrl(file.storageId);
                return {
                  ...file,
                  url,
                };
              }
              return null;
            })
          );
        }
        return {
          ...message,
          files: files?.filter(Boolean),
        };
      })
    );

    return messagesWithFiles.reverse();
  },
});

// ユーザー情報付きメッセージ一覧取得
export const getMessagesWithUsers = action({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("認証エラー: ユーザー情報付きメッセージ取得でユーザーのIdentityが取得できませんでした");
      return [];
    }

    // メッセージ一覧を直接取得
    const limit = args.limit || 100;
    const messages = await ctx.runQuery(api.messages.getMessages, {
      workspaceId: args.workspaceId,
      limit,
    });

    // ユニークなユーザーIDを収集
    const userIds = [...new Set(messages.map((msg) => msg.userId))];

    // Clerkからユーザー情報を取得
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    const users = await Promise.all(
      userIds.map(async (userId) => {
        try {
          const user = await clerk.users.getUser(userId);
          return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
            username: user.username,
            emailAddress: user.emailAddresses?.[0]?.emailAddress,
          };
        } catch (error) {
          console.error(`Failed to fetch user ${userId}:`, error);
          return null;
        }
      })
    );

    const userMap = new Map(
      users.filter(Boolean).map((user) => [user!.id, user])
    );

    // メッセージにユーザー情報を追加
    return messages.map((message) => ({
      ...message,
      user: userMap.get(message.userId) || null,
    }));
  },
});

// メッセージ編集
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // 自分のメッセージか確認
    if (message.userId !== identity.subject) {
      throw new Error("Can only edit your own messages");
    }

    // メッセージを更新
    await ctx.db.patch(args.messageId, {
      content: args.content,
      updatedAt: Date.now(),
      isEdited: true,
    });
  },
});

// メッセージ削除
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // 自分のメッセージか、ワークスペースのオーナーか確認
    const workspace = await ctx.db.get(message.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const userId = identity.subject;
    if (message.userId !== userId && workspace.ownerId !== userId) {
      throw new Error("Not authorized to delete this message");
    }

    // 関連するファイルを削除
    if (message.fileIds && message.fileIds.length > 0) {
      for (const fileId of message.fileIds) {
        const file = await ctx.db.get(fileId);
        if (file) {
          // ストレージからファイルを削除
          await ctx.storage.delete(file.storageId);
          // ファイル情報を削除
          await ctx.db.delete(fileId);
        }
      }
    }

    // メッセージを削除
    await ctx.db.delete(args.messageId);
  },
});

// Internal mutation for saving chat files
export const saveChatFile = internalMutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    uploadedBy: v.string(),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chatFiles", {
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      uploadedBy: args.uploadedBy,
      workspaceId: args.workspaceId,
      createdAt: Date.now(),
    });
  },
});