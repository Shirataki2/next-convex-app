import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "@jest/globals";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";

describe("タスク関数", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    t = convexTest(schema);
  });

  describe("createTask", () => {
    it("新しいタスクを作成できる", async () => {
      const userId = "user123";

      // ワークスペースを作成
      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "タスクテスト",
        ownerId: userId,
      });

      // タスクを作成
      const taskId = await t.mutation(api.tasks.createTask, {
        title: "テストタスク",
        description: "テスト用のタスクです",
        status: "todo",
        workspaceId,
        priority: "medium",
        userId,
      });

      expect(taskId).toBeDefined();

      // 作成されたタスクを確認
      const tasks = await t.query(api.tasks.getWorkspaceTasks, {
        workspaceId,
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        title: "テストタスク",
        description: "テスト用のタスクです",
        status: "todo",
        priority: "medium",
        order: 1,
      });
    });

    it("ワークスペースメンバーのみタスクを作成できる", async () => {
      const ownerId = "owner123";
      const nonMemberId = "nonmember456";

      // ワークスペースを作成
      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "権限テスト",
        ownerId,
      });

      // 非メンバーがタスクを作成しようとする
      await expect(
        t.mutation(api.tasks.createTask, {
          title: "不正なタスク",
          status: "todo",
          workspaceId,
          priority: "low",
          userId: nonMemberId,
        })
      ).rejects.toThrow("このワークスペースにタスクを作成する権限がありません");
    });

    it("タスクの順序が自動的に設定される", async () => {
      const userId = "user123";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "順序テスト",
        ownerId: userId,
      });

      // 複数のタスクを作成
      await t.mutation(api.tasks.createTask, {
        title: "タスク1",
        status: "todo",
        workspaceId,
        priority: "high",
        userId,
      });

      await t.mutation(api.tasks.createTask, {
        title: "タスク2",
        status: "todo",
        workspaceId,
        priority: "medium",
        userId,
      });

      await t.mutation(api.tasks.createTask, {
        title: "タスク3",
        status: "in_progress",
        workspaceId,
        priority: "low",
        userId,
      });

      const tasks = await t.query(api.tasks.getWorkspaceTasks, {
        workspaceId,
      });

      expect(tasks).toHaveLength(3);
      expect(tasks[0].order).toBe(1);
      expect(tasks[1].order).toBe(2);
      expect(tasks[2].order).toBe(3);
    });
  });

  describe("updateTask", () => {
    it("タスクを更新できる", async () => {
      const userId = "user123";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "更新テスト",
        ownerId: userId,
      });

      const taskId = await t.mutation(api.tasks.createTask, {
        title: "元のタイトル",
        status: "todo",
        workspaceId,
        priority: "low",
        userId,
      });

      // タスクを更新
      const result = await t.mutation(api.tasks.updateTask, {
        taskId,
        updates: {
          title: "更新されたタイトル",
          status: "in_progress",
          priority: "high",
          description: "新しい説明",
        },
        userId,
      });

      expect(result.success).toBe(true);

      const tasks = await t.query(api.tasks.getWorkspaceTasks, {
        workspaceId,
      });

      expect(tasks[0]).toMatchObject({
        title: "更新されたタイトル",
        status: "in_progress",
        priority: "high",
        description: "新しい説明",
      });
    });

    it("ワークスペースメンバーのみタスクを更新できる", async () => {
      const ownerId = "owner123";
      const nonMemberId = "nonmember456";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "権限テスト",
        ownerId,
      });

      const taskId = await t.mutation(api.tasks.createTask, {
        title: "保護されたタスク",
        status: "todo",
        workspaceId,
        priority: "medium",
        userId: ownerId,
      });

      // 非メンバーがタスクを更新しようとする
      await expect(
        t.mutation(api.tasks.updateTask, {
          taskId,
          updates: {
            title: "不正な更新",
          },
          userId: nonMemberId,
        })
      ).rejects.toThrow("このタスクを更新する権限がありません");
    });
  });

  describe("deleteTask", () => {
    it("タスクを削除できる", async () => {
      const userId = "user123";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "削除テスト",
        ownerId: userId,
      });

      const taskId = await t.mutation(api.tasks.createTask, {
        title: "削除予定のタスク",
        status: "todo",
        workspaceId,
        priority: "low",
        userId,
      });

      // 初期状態を確認
      let tasks = await t.query(api.tasks.getWorkspaceTasks, {
        workspaceId,
      });
      expect(tasks).toHaveLength(1);

      // タスクを削除
      const result = await t.mutation(api.tasks.deleteTask, {
        taskId,
        userId,
      });

      expect(result.success).toBe(true);

      // 削除後を確認
      tasks = await t.query(api.tasks.getWorkspaceTasks, {
        workspaceId,
      });
      expect(tasks).toHaveLength(0);
    });

    it("ワークスペースメンバーのみタスクを削除できる", async () => {
      const ownerId = "owner123";
      const nonMemberId = "nonmember456";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "権限テスト",
        ownerId,
      });

      const taskId = await t.mutation(api.tasks.createTask, {
        title: "保護されたタスク",
        status: "todo",
        workspaceId,
        priority: "medium",
        userId: ownerId,
      });

      // 非メンバーがタスクを削除しようとする
      await expect(
        t.mutation(api.tasks.deleteTask, {
          taskId,
          userId: nonMemberId,
        })
      ).rejects.toThrow("このタスクを削除する権限がありません");
    });
  });

  describe("updateTaskOrder", () => {
    it("タスクの順序を更新できる", async () => {
      const userId = "user123";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "順序更新テスト",
        ownerId: userId,
      });

      const taskId = await t.mutation(api.tasks.createTask, {
        title: "順序テスト",
        status: "todo",
        workspaceId,
        priority: "medium",
        userId,
      });

      // 順序を更新
      const result = await t.mutation(api.tasks.updateTaskOrder, {
        taskId,
        newOrder: 10,
        userId,
      });

      expect(result.success).toBe(true);

      const tasks = await t.query(api.tasks.getWorkspaceTasks, {
        workspaceId,
      });

      expect(tasks[0].order).toBe(10);
    });
  });

  describe("getWorkspaceActivities", () => {
    it("ワークスペースのアクティビティを取得できる", async () => {
      const userId = "user123";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "アクティビティテスト",
        ownerId: userId,
      });

      // タスクを作成（アクティビティが記録される）
      const taskId = await t.mutation(api.tasks.createTask, {
        title: "アクティビティタスク",
        status: "todo",
        workspaceId,
        priority: "medium",
        userId,
      });

      // タスクを更新（アクティビティが記録される）
      await t.mutation(api.tasks.updateTask, {
        taskId,
        updates: {
          status: "in_progress",
        },
        userId,
      });

      // アクティビティを取得
      const activities = await t.query(api.tasks.getWorkspaceActivities, {
        workspaceId,
        limit: 10,
      });

      expect(activities).toHaveLength(2);
      expect(activities[0].action).toBe("updated"); // 最新が最初
      expect(activities[1].action).toBe("created");
      expect(activities[0].userId).toBe(userId);
      expect(activities[1].userId).toBe(userId);
    });

    it("アクティビティの制限が機能する", async () => {
      const userId = "user123";

      const workspaceId = await t.mutation(api.workspaces.createWorkspace, {
        name: "制限テスト",
        ownerId: userId,
      });

      // 複数のタスクを作成
      for (let i = 0; i < 5; i++) {
        await t.mutation(api.tasks.createTask, {
          title: `タスク${i + 1}`,
          status: "todo",
          workspaceId,
          priority: "medium",
          userId,
        });
      }

      // 制限付きでアクティビティを取得
      const activities = await t.query(api.tasks.getWorkspaceActivities, {
        workspaceId,
        limit: 3,
      });

      expect(activities).toHaveLength(3);
    });
  });
});