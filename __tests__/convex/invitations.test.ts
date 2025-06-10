import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { Id } from "../../convex/_generated/dataModel";

describe("Invitations", () => {
  let t: any;
  let workspaceId: Id<"workspaces">;
  let ownerId: string;
  let memberId: string;

  beforeEach(async () => {
    t = convexTest(schema);
    ownerId = "user_owner_123";
    memberId = "user_member_456";

    // テスト用ワークスペースを作成
    workspaceId = await t.mutation(api.workspaces.createWorkspace, {
      name: "Test Workspace",
      ownerId,
    });
  });

  test("createInvitation: 有効な招待を作成できる", async () => {
    const invitationId = await t.mutation(api.invitations.createInvitation, {
      workspaceId,
      email: "test@example.com",
      role: "member",
      inviterUserId: ownerId,
    });

    expect(invitationId).toBeDefined();

    // 作成された招待を確認
    const invitations = await t.query(api.invitations.getWorkspaceInvitations, {
      workspaceId,
    });

    expect(invitations).toHaveLength(1);
    expect(invitations[0].email).toBe("test@example.com");
    expect(invitations[0].role).toBe("member");
    expect(invitations[0].status).toBe("pending");
    expect(invitations[0].inviterUserId).toBe(ownerId);
  });

  test("createInvitation: 存在しないワークスペースへの招待はエラー", async () => {
    // テスト用の実在しないワークスペースID
    const fakeWorkspaceId = "k175555555555555555555555" as Id<"workspaces">;

    await expect(
      t.mutation(api.invitations.createInvitation, {
        workspaceId: fakeWorkspaceId,
        email: "test@example.com",
        role: "member",
        inviterUserId: ownerId,
      })
    ).rejects.toThrow("ワークスペースが見つかりません");
  });

  test("createInvitation: 権限のないユーザーは招待できない", async () => {
    const unauthorizedUser = "user_unauthorized_789";

    await expect(
      t.mutation(api.invitations.createInvitation, {
        workspaceId,
        email: "test@example.com",
        role: "member",
        inviterUserId: unauthorizedUser,
      })
    ).rejects.toThrow("このワークスペースに招待する権限がありません");
  });

  test("createInvitation: 同じメールアドレスに重複招待はできない", async () => {
    const email = "test@example.com";

    // 最初の招待
    await t.mutation(api.invitations.createInvitation, {
      workspaceId,
      email,
      role: "member",
      inviterUserId: ownerId,
    });

    // 同じメールアドレスへの重複招待
    await expect(
      t.mutation(api.invitations.createInvitation, {
        workspaceId,
        email,
        role: "member",
        inviterUserId: ownerId,
      })
    ).rejects.toThrow("このメールアドレスには既に招待を送信済みです");
  });

  test("acceptInvitation: 有効な招待を受け入れできる", async () => {
    // 招待を作成
    const invitationId = await t.mutation(api.invitations.createInvitation, {
      workspaceId,
      email: "test@example.com",
      role: "member",
      inviterUserId: ownerId,
    });

    // 招待を取得してトークンを確認
    const invitations = await t.query(api.invitations.getWorkspaceInvitations, {
      workspaceId,
    });
    const invitation = invitations[0];

    // 招待を受け入れ
    const result = await t.mutation(api.invitations.acceptInvitation, {
      token: invitation.token,
      userId: memberId,
    });

    expect(result.success).toBe(true);
    expect(result.workspaceId).toBe(workspaceId);

    // ワークスペースのメンバーに追加されていることを確認
    const workspace = await t.query(api.workspaces.getWorkspace, {
      workspaceId,
    });
    expect(workspace?.members).toContain(memberId);

    // 招待のステータスが更新されていることを確認
    const updatedInvitations = await t.query(
      api.invitations.getWorkspaceInvitations,
      { workspaceId }
    );
    expect(updatedInvitations[0].status).toBe("accepted");
  });

  test("acceptInvitation: 無効なトークンでの受け入れはエラー", async () => {
    await expect(
      t.mutation(api.invitations.acceptInvitation, {
        token: "invalid_token",
        userId: memberId,
      })
    ).rejects.toThrow("招待が見つかりません");
  });

  test("acceptInvitation: 既に処理済みの招待は受け入れできない", async () => {
    // 招待を作成
    await t.mutation(api.invitations.createInvitation, {
      workspaceId,
      email: "test@example.com",
      role: "member",
      inviterUserId: ownerId,
    });

    // 招待を取得
    const invitations = await t.query(api.invitations.getWorkspaceInvitations, {
      workspaceId,
    });
    const invitation = invitations[0];

    // 招待を一度受け入れ
    await t.mutation(api.invitations.acceptInvitation, {
      token: invitation.token,
      userId: memberId,
    });

    // 同じ招待を再度受け入れようとする
    await expect(
      t.mutation(api.invitations.acceptInvitation, {
        token: invitation.token,
        userId: "user_another_789",
      })
    ).rejects.toThrow("この招待は既に処理されています");
  });

  test("revokeInvitation: オーナーは招待を取り消しできる", async () => {
    // 招待を作成
    const invitationId = await t.mutation(api.invitations.createInvitation, {
      workspaceId,
      email: "test@example.com",
      role: "member",
      inviterUserId: ownerId,
    });

    // 招待を取り消し
    const result = await t.mutation(api.invitations.revokeInvitation, {
      invitationId,
      userId: ownerId,
    });

    expect(result.success).toBe(true);

    // 招待のステータスが更新されていることを確認
    const invitations = await t.query(api.invitations.getWorkspaceInvitations, {
      workspaceId,
    });
    expect(invitations[0].status).toBe("rejected");
  });

  test("revokeInvitation: 権限のないユーザーは招待を取り消しできない", async () => {
    // 招待を作成
    const invitationId = await t.mutation(api.invitations.createInvitation, {
      workspaceId,
      email: "test@example.com",
      role: "member",
      inviterUserId: ownerId,
    });

    // 権限のないユーザーが招待を取り消そうとする
    await expect(
      t.mutation(api.invitations.revokeInvitation, {
        invitationId,
        userId: "user_unauthorized_789",
      })
    ).rejects.toThrow("この招待を取り消す権限がありません");
  });

  test("getInvitationByToken: 有効なトークンで招待を取得できる", async () => {
    // 招待を作成
    await t.mutation(api.invitations.createInvitation, {
      workspaceId,
      email: "test@example.com",
      role: "member",
      inviterUserId: ownerId,
    });

    // 作成された招待を取得
    const invitations = await t.query(api.invitations.getWorkspaceInvitations, {
      workspaceId,
    });
    const invitation = invitations[0];

    // トークンで招待を取得
    const result = await t.query(api.invitations.getInvitationByToken, {
      token: invitation.token,
    });

    expect(result).toBeDefined();
    expect(result?.email).toBe("test@example.com");
    expect(result?.expired).toBe(false);
    expect(result?.workspace).toBeDefined();
  });

  test("getInvitationByToken: 無効なトークンではnullを返す", async () => {
    const result = await t.query(api.invitations.getInvitationByToken, {
      token: "invalid_token",
    });

    expect(result).toBeNull();
  });

  test("getInvitationByToken: 期限切れの招待は期限切れフラグが立つ", async () => {
    // 招待を作成
    await t.mutation(api.invitations.createInvitation, {
      workspaceId,
      email: "test@example.com",
      role: "member",
      inviterUserId: ownerId,
    });

    // 作成された招待を取得
    const invitations = await t.query(api.invitations.getWorkspaceInvitations, {
      workspaceId,
    });
    const invitation = invitations[0];

    // 招待の有効期限を過去の日時に変更（直接データベースパッチ）
    await t.run(async (ctx: any) => {
      await ctx.db.patch(invitation._id, {
        expiresAt: Date.now() - 1000, // 1秒前
      });
    });

    // トークンで招待を取得
    const result = await t.query(api.invitations.getInvitationByToken, {
      token: invitation.token,
    });

    expect(result).toBeDefined();
    expect(result?.expired).toBe(true);
  });
});
