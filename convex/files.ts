import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// アップロードURL生成（認証済みユーザーのみ）
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// ファイル情報をデータベースに保存
export const saveUploadedFile = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    const fileId = await ctx.db.insert("chatFiles", {
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      uploadedBy: identity.subject,
      workspaceId: args.workspaceId,
      createdAt: Date.now(),
    });

    return fileId;
  },
});

// ファイルURL取得
export const getFileUrl = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("認証が必要です");
    }

    return await ctx.storage.getUrl(args.storageId);
  },
});
