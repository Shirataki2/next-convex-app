import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { TestConvex } from "convex-test";

describe("Realtime Tasks", () => {
  let t: TestConvex<typeof schema>;
  let workspaceId: Id<"workspaces">;
  let ownerId: string;

  beforeEach(async () => {
    t = convexTest(schema);
    ownerId = "user_owner_123";

    // テスト用ワークスペースを作成
    workspaceId = await t.mutation(api.workspaces.createWorkspace, {
      name: "Test Workspace",
      ownerId,
    });
  });

  test("getWorkspaceTasksRealtime: リアルタイムタスク一覧を取得できる", async () => {
    // リアルタイムタスク一覧を取得
    const tasks = await t.query(api.tasks.getWorkspaceTasksRealtime, {
      workspaceId,
    });

    expect(tasks).toHaveLength(2);
    expect(tasks.map((task) => task.title)).toEqual(
      expect.arrayContaining(["Task 1", "Task 2"])
    );
    expect(tasks.map((task) => task.status)).toEqual(
      expect.arrayContaining(["todo", "in_progress"])
    );
  });

  test("getWorkspaceMembersRealtime: ワークスペースメンバー情報を取得できる", async () => {
    const memberId = "user_member_456";

    // メンバーを追加
    await t.run(async (ctx) => {
      const workspace: Doc<"workspaces"> | null = await ctx.db.get(workspaceId);
      if (!workspace) {
        throw new Error("Workspace not found");
      }
      await ctx.db.patch(workspaceId, {
        members: [...workspace.members, memberId],
      });
    });

    // メンバー情報を取得
    const members = await t.query(api.tasks.getWorkspaceMembersRealtime, {
      workspaceId,
    });

    expect(members).toHaveLength(2);
    expect(members.map((member) => member.id)).toEqual(
      expect.arrayContaining([ownerId, memberId])
    );
  });

  test("リアルタイムデータが一致することを確認", async () => {
    // 複数のタスクを作成
    await t.mutation(api.tasks.createTask, {
      title: "Todo Task",
      status: "todo",
      workspaceId,
      priority: "low",
      userId: ownerId,
    });

    await t.mutation(api.tasks.createTask, {
      title: "In Progress Task",
      status: "in_progress",
      workspaceId,
      priority: "medium",
      userId: ownerId,
    });

    await t.mutation(api.tasks.createTask, {
      title: "Done Task",
      status: "done",
      workspaceId,
      priority: "high",
      userId: ownerId,
    });

    // 既存のクエリとリアルタイムクエリの結果を比較
    const originalTasks = await t.query(api.tasks.getWorkspaceTasks, {
      workspaceId,
    });

    const realtimeTasks = await t.query(api.tasks.getWorkspaceTasksRealtime, {
      workspaceId,
    });

    expect(realtimeTasks).toHaveLength(originalTasks.length);
    expect(realtimeTasks.map((task) => task._id)).toEqual(
      originalTasks.map((task) => task._id)
    );
  });

  test("タスク更新後のリアルタイム同期を確認", async () => {
    // タスクを作成
    const taskId = await t.mutation(api.tasks.createTask, {
      title: "Test Task",
      status: "todo",
      workspaceId,
      priority: "medium",
      userId: ownerId,
    });

    // 初期状態を確認
    let tasks = await t.query(api.tasks.getWorkspaceTasksRealtime, {
      workspaceId,
    });

    const initialTask = tasks.find((task) => task._id === taskId);
    expect(initialTask?.status).toBe("todo");
    expect(initialTask?.order).toBe(1);

    // タスクを更新
    await t.mutation(api.tasks.updateTask, {
      taskId,
      updates: { status: "in_progress", order: 2 },
      userId: ownerId,
    });

    // 更新後の状態を確認（リアルタイム反映）
    tasks = await t.query(api.tasks.getWorkspaceTasksRealtime, {
      workspaceId,
    });

    const updatedTask = tasks.find((task) => task._id === taskId);
    expect(updatedTask?.status).toBe("in_progress");
    expect(updatedTask?.order).toBe(2);
  });

  test("複数タスクの順序変更がリアルタイムで反映される", async () => {
    // 複数のタスクを作成
    const taskIds = await Promise.all([
      t.mutation(api.tasks.createTask, {
        title: "Task 1",
        status: "todo",
        workspaceId,
        priority: "medium",
        userId: ownerId,
      }),
      t.mutation(api.tasks.createTask, {
        title: "Task 2",
        status: "todo",
        workspaceId,
        priority: "medium",
        userId: ownerId,
      }),
      t.mutation(api.tasks.createTask, {
        title: "Task 3",
        status: "todo",
        workspaceId,
        priority: "medium",
        userId: ownerId,
      }),
    ]);

    // 順序を変更
    await Promise.all([
      t.mutation(api.tasks.updateTask, {
        taskId: taskIds[0],
        updates: { order: 3 },
        userId: ownerId,
      }),
      t.mutation(api.tasks.updateTask, {
        taskId: taskIds[1],
        updates: { order: 1 },
        userId: ownerId,
      }),
      t.mutation(api.tasks.updateTask, {
        taskId: taskIds[2],
        updates: { order: 2 },
        userId: ownerId,
      }),
    ]);

    // 順序が正しく更新されていることを確認
    const tasks = await t.query(api.tasks.getWorkspaceTasksRealtime, {
      workspaceId,
    });

    const todoTasks = tasks
      .filter((task) => task.status === "todo")
      .sort((a, b) => a.order - b.order);

    expect(todoTasks.map((task) => task.title)).toEqual([
      "Task 2", // order: 1
      "Task 3", // order: 2
      "Task 1", // order: 3
    ]);
  });

  test("存在しないワークスペースではメンバー情報が空配列", async () => {
    // テスト用の実在しないワークスペースIDを作成
    const fakeWorkspaceId = "k175555555555555555555555" as Id<"workspaces">;

    const members = await t.query(api.tasks.getWorkspaceMembersRealtime, {
      workspaceId: fakeWorkspaceId,
    });

    expect(members).toEqual([]);
  });

  test("リアルタイムデータのパフォーマンステスト", async () => {
    // 大量のタスクを作成
    const taskPromises = [];
    for (let i = 0; i < 50; i++) {
      taskPromises.push(
        t.mutation(api.tasks.createTask, {
          title: `Performance Test Task ${i}`,
          status: i % 3 === 0 ? "todo" : i % 3 === 1 ? "in_progress" : "done",
          workspaceId,
          priority: i % 3 === 0 ? "low" : i % 3 === 1 ? "medium" : "high",
          userId: ownerId,
        })
      );
    }

    await Promise.all(taskPromises);

    // リアルタイムクエリの実行時間を測定
    const queryStartTime = Date.now();
    const tasks = await t.query(api.tasks.getWorkspaceTasksRealtime, {
      workspaceId,
    });
    const queryEndTime = Date.now();

    expect(tasks).toHaveLength(50);

    // クエリ実行時間が合理的な範囲内であることを確認（1秒以内）
    const queryDuration = queryEndTime - queryStartTime;
    expect(queryDuration).toBeLessThan(1000);

    console.log(`リアルタイムクエリ実行時間: ${queryDuration}ms`);
  });
});
