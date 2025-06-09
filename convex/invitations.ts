import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createClerkClient } from "@clerk/backend";

// 招待を作成
export const createInvitation = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.string(),
    inviterUserId: v.string(),
  },
  handler: async (ctx, { workspaceId, email, role, inviterUserId }) => {
    // ワークスペースの存在確認
    const workspace = await ctx.db.get(workspaceId);
    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    // 招待者がワークスペースのオーナーまたはメンバーか確認
    if (
      workspace.ownerId !== inviterUserId &&
      !workspace.members.includes(inviterUserId)
    ) {
      throw new Error("このワークスペースに招待する権限がありません");
    }

    // 既に招待済みでないか確認
    const existingInvitation = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .filter((q) => q.eq(q.field("email"), email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingInvitation) {
      throw new Error("このメールアドレスには既に招待を送信済みです");
    }

    // 既にメンバーでないか確認（将来的にClerkのユーザー検索で確認）

    // ユニークなトークンを生成
    const token = crypto.randomUUID();

    // 有効期限（7日後）
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    // 招待を作成
    const invitationId = await ctx.db.insert("workspaceInvitations", {
      workspaceId,
      inviterUserId,
      email,
      status: "pending",
      token,
      role,
      createdAt: Date.now(),
      expiresAt,
    });

    return invitationId;
  },
});

// ワークスペースの招待一覧を取得
export const getWorkspaceInvitations = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const invitations = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    return invitations;
  },
});

// トークンで招待を取得
export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invitation = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!invitation) {
      return null;
    }

    // 有効期限チェック
    if (invitation.expiresAt < Date.now()) {
      return { ...invitation, expired: true };
    }

    // ワークスペース情報も取得
    const workspace = await ctx.db.get(invitation.workspaceId);

    return {
      ...invitation,
      workspace,
      expired: false,
    };
  },
});

// 招待を受け入れ
export const acceptInvitation = mutation({
  args: {
    token: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { token, userId }) => {
    // トークンで招待を検索
    const invitation = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!invitation) {
      throw new Error("招待が見つかりません");
    }

    if (invitation.status !== "pending") {
      throw new Error("この招待は既に処理されています");
    }

    if (invitation.expiresAt < Date.now()) {
      throw new Error("招待の有効期限が切れています");
    }

    // ワークスペースを取得
    const workspace = await ctx.db.get(invitation.workspaceId);
    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    // 既にメンバーでないか確認
    if (workspace.members.includes(userId)) {
      throw new Error("既にこのワークスペースのメンバーです");
    }

    // ワークスペースにメンバーを追加
    await ctx.db.patch(invitation.workspaceId, {
      members: [...workspace.members, userId],
    });

    // 招待のステータスを更新
    await ctx.db.patch(invitation._id, {
      status: "accepted",
    });

    return { success: true, workspaceId: invitation.workspaceId };
  },
});

// 招待を取り消し
export const revokeInvitation = mutation({
  args: {
    invitationId: v.id("workspaceInvitations"),
    userId: v.string(),
  },
  handler: async (ctx, { invitationId, userId }) => {
    const invitation = await ctx.db.get(invitationId);
    if (!invitation) {
      throw new Error("招待が見つかりません");
    }

    // ワークスペースを取得
    const workspace = await ctx.db.get(invitation.workspaceId);
    if (!workspace) {
      throw new Error("ワークスペースが見つかりません");
    }

    // 権限確認（オーナーまたは招待者）
    if (workspace.ownerId !== userId && invitation.inviterUserId !== userId) {
      throw new Error("この招待を取り消す権限がありません");
    }

    // 招待のステータスを更新
    await ctx.db.patch(invitationId, {
      status: "rejected",
    });

    return { success: true };
  },
});

// 招待されたユーザーの情報を取得（アクション）
export const getInviterInfo = action({
  args: { inviterUserId: v.string() },
  handler: async (ctx, { inviterUserId }) => {
    try {
      const clerk = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      const user = await clerk.users.getUser(inviterUserId);

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        username: user.username,
        emailAddress: user.emailAddresses?.[0]?.emailAddress,
      };
    } catch (error) {
      console.error("招待者情報の取得に失敗:", error);
      return null;
    }
  },
});

// メールで既存ユーザーを検索（アクション）
export const checkUserByEmail = action({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    try {
      const clerk = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      // メールアドレスでユーザーを検索
      const users = await clerk.users.getUserList({
        emailAddress: [email],
      });

      if (users.data.length > 0) {
        const user = users.data[0];
        return {
          exists: true,
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          username: user.username,
          emailAddress: user.emailAddresses?.[0]?.emailAddress,
        };
      }

      return { exists: false };
    } catch (error) {
      console.error("ユーザー検索に失敗:", error);
      return { exists: false };
    }
  },
});
