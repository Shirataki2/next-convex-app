import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "@jest/globals";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";

describe("ワークスペース関数", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    t = convexTest(schema);
  });

  describe("createWorkspace", () => {
    it("新しいワークスペースを作成できる", async () => {
      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "テストワークスペース",
        ownerId: "user123",
      });

      expect(workspaceId).toBeDefined();

      // 作成されたワークスペースを取得して確認
      const workspace = await t.query(api.workspaces.getWorkspace, {
        workspaceId,
      });

      expect(workspace).toMatchObject({
        name: "テストワークスペース",
        ownerId: "user123",
        members: ["user123"],
      });
    });

    it("オーナーがデフォルトでメンバーに含まれる", async () => {
      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "メンバーテスト",
        ownerId: "owner123",
      });

      const workspace = await t.query(api.workspaces.getWorkspace, {
        workspaceId,
      });

      expect(workspace?.members).toContain("owner123");
      expect(workspace?.members).toHaveLength(1);
    });
  });

  describe("getUserWorkspaces", () => {
    it("ユーザーが所属するワークスペースを取得できる", async () => {
      const userId = "user123";

      // ワークスペースを作成
      await t.mutation(api.workspaces.createWorkspace, {
        name: "ワークスペース1",
        ownerId: userId,
      });

      await t.mutation(api.workspaces.createWorkspace, {
        name: "ワークスペース2",
        ownerId: userId,
      });

      // ユーザーのワークスペースを取得
      const workspaces = await t.query(api.workspaces.getUserWorkspaces, {
        userId,
      });

      expect(workspaces).toHaveLength(2);
      expect(workspaces.map((w) => w.name)).toContain("ワークスペース1");
      expect(workspaces.map((w) => w.name)).toContain("ワークスペース2");
    });

    it("所属していないワークスペースは取得されない", async () => {
      const userId1 = "user1";
      const userId2 = "user2";

      // user1のワークスペースを作成
      await t.mutation(api.workspaces.createWorkspace, {
        name: "User1のワークスペース",
        ownerId: userId1,
      });

      // user2のワークスペースを取得 (空であることを確認)
      const workspaces = await t.query(api.workspaces.getUserWorkspaces, {
        userId: userId2,
      });

      expect(workspaces).toHaveLength(0);
    });
  });

  describe("updateWorkspaceName", () => {
    it("オーナーはワークスペース名を更新できる", async () => {
      const ownerId = "owner123";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "古い名前",
        ownerId,
      });

      const result = await t.mutation(api.workspaces.updateWorkspaceName, {
        workspaceId,
        name: "新しい名前",
        userId: ownerId,
      });

      expect(result.success).toBe(true);

      const workspace = await t.query(api.workspaces.getWorkspace, {
        workspaceId,
      });

      expect(workspace?.name).toBe("新しい名前");
    });

    it("オーナー以外はワークスペース名を更新できない", async () => {
      const ownerId = "owner123";
      const otherUserId = "other456";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "テストワークスペース",
        ownerId,
      });

      await expect(
        t.mutation(api.workspaces.updateWorkspaceName, {
          workspaceId,
          name: "不正な更新",
          userId: otherUserId,
        })
      ).rejects.toThrow("ワークスペースを編集する権限がありません");
    });
  });

  describe("addMemberToWorkspace", () => {
    it("オーナーはメンバーを追加できる", async () => {
      const ownerId = "owner123";
      const newMemberId = "member456";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "メンバー追加テスト",
        ownerId,
      });

      const result = await t.mutation(api.workspaces.addMemberToWorkspace, {
        workspaceId,
        memberId: newMemberId,
        userId: ownerId,
      });

      expect(result.success).toBe(true);

      const workspace = await t.query(api.workspaces.getWorkspace, {
        workspaceId,
      });

      expect(workspace?.members).toContain(newMemberId);
      expect(workspace?.members).toHaveLength(2);
    });

    it("オーナー以外はメンバーを追加できない", async () => {
      const ownerId = "owner123";
      const otherUserId = "other456";
      const newMemberId = "member789";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "権限テスト",
        ownerId,
      });

      await expect(
        t.mutation(api.workspaces.addMemberToWorkspace, {
          workspaceId,
          memberId: newMemberId,
          userId: otherUserId,
        })
      ).rejects.toThrow("メンバーを追加する権限がありません");
    });

    it("既にメンバーのユーザーは追加できない", async () => {
      const ownerId = "owner123";
      const memberId = "member456";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "重複テスト",
        ownerId,
      });

      // 最初の追加
      await t.mutation(api.workspaces.addMemberToWorkspace, {
        workspaceId,
        memberId,
        userId: ownerId,
      });

      // 重複追加を試行
      await expect(
        t.mutation(api.workspaces.addMemberToWorkspace, {
          workspaceId,
          memberId,
          userId: ownerId,
        })
      ).rejects.toThrow("ユーザーは既にメンバーです");
    });
  });

  describe("removeMemberFromWorkspace", () => {
    it("オーナーはメンバーを削除できる", async () => {
      const ownerId = "owner123";
      const memberId = "member456";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "メンバー削除テスト",
        ownerId,
      });

      // メンバーを追加
      await t.mutation(api.workspaces.addMemberToWorkspace, {
        workspaceId,
        memberId,
        userId: ownerId,
      });

      // メンバーを削除
      const result = await t.mutation(api.workspaces.removeMemberFromWorkspace, {
        workspaceId,
        memberId,
        userId: ownerId,
      });

      expect(result.success).toBe(true);

      const workspace = await t.query(api.workspaces.getWorkspace, {
        workspaceId,
      });

      expect(workspace?.members).not.toContain(memberId);
      expect(workspace?.members).toHaveLength(1);
    });

    it("オーナー自身は削除できない", async () => {
      const ownerId = "owner123";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "オーナー削除テスト",
        ownerId,
      });

      await expect(
        t.mutation(api.workspaces.removeMemberFromWorkspace, {
          workspaceId,
          memberId: ownerId,
          userId: ownerId,
        })
      ).rejects.toThrow("オーナーは削除できません");
    });
  });

  describe("deleteWorkspace", () => {
    it("オーナーはワークスペースを削除できる", async () => {
      const ownerId = "owner123";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "削除テスト",
        ownerId,
      });

      const result = await t.mutation(api.workspaces.deleteWorkspace, {
        workspaceId,
        userId: ownerId,
      });

      expect(result.success).toBe(true);

      // 削除されたワークスペースは取得できない
      const workspace = await t.query(api.workspaces.getWorkspace, {
        workspaceId,
      });

      expect(workspace).toBeNull();
    });

    it("オーナー以外はワークスペースを削除できない", async () => {
      const ownerId = "owner123";
      const otherUserId = "other456";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "権限削除テスト",
        ownerId,
      });

      await expect(
        t.mutation(api.workspaces.deleteWorkspace, {
          workspaceId,
          userId: otherUserId,
        })
      ).rejects.toThrow("ワークスペースを削除する権限がありません");
    });
  });
});