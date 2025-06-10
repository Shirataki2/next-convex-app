import { renderHook, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { useRealtimeTasks } from "@/hooks/use-realtime-tasks";
import { TestWrapper } from "@/__tests__/utils/test-wrapper";

// Convexのモック
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useAction: vi.fn(),
}));

const mockUseQuery = vi.fn();
const mockUseAction = vi.fn();

// Clerkのモック
vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(() => ({
    user: { id: "user_123" },
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useRealtimeTasks", () => {
  const mockWorkspaceId = "workspace_123" as any;

  test("リアルタイムタスクデータを正しく取得する", async () => {
    const mockTasks = [
      {
        _id: "task_1",
        _creationTime: Date.now(),
        title: "Test Task 1",
        description: "Description 1",
        status: "todo",
        order: 1,
        workspaceId: mockWorkspaceId,
        assigneeId: "user_123",
        priority: "medium",
      },
      {
        _id: "task_2",
        _creationTime: Date.now(),
        title: "Test Task 2",
        description: "Description 2",
        status: "in_progress",
        order: 1,
        workspaceId: mockWorkspaceId,
        assigneeId: null,
        priority: "high",
      },
    ];

    const mockMembers = [{ id: "user_123" }, { id: "user_456" }];

    const convexReact = await import("convex/react");
    vi.mocked(convexReact.useQuery)
      .mockReturnValueOnce(mockTasks) // getWorkspaceTasksRealtime
      .mockReturnValueOnce(mockMembers); // getWorkspaceMembersRealtime

    vi.mocked(convexReact.useAction).mockReturnValue(
      vi.fn().mockResolvedValue({
        id: "user_123",
        firstName: "Test",
        lastName: "User",
        imageUrl: "https://example.com/avatar.jpg",
        username: "testuser",
        emailAddress: "test@example.com",
      })
    );

    const { result } = renderHook(() => useRealtimeTasks(mockWorkspaceId), {
      wrapper: TestWrapper,
    });

    expect(result.current.isLoadingTasks).toBe(false);
    expect(result.current.tasks).toHaveLength(2);
    expect(result.current.groupedTasks.todo).toHaveLength(1);
    expect(result.current.groupedTasks.inProgress).toHaveLength(1);
    expect(result.current.groupedTasks.done).toHaveLength(0);
    expect(result.current.stats.total).toBe(2);
  });

  test("タスクの統計情報を正しく計算する", async () => {
    const mockTasks = [
      {
        _id: "task_1",
        _creationTime: Date.now(),
        title: "Task 1",
        status: "todo",
        order: 1,
        workspaceId: mockWorkspaceId,
        priority: "medium",
      },
      {
        _id: "task_2",
        _creationTime: Date.now(),
        title: "Task 2",
        status: "todo",
        order: 2,
        workspaceId: mockWorkspaceId,
        priority: "high",
      },
      {
        _id: "task_3",
        _creationTime: Date.now(),
        title: "Task 3",
        status: "in_progress",
        order: 1,
        workspaceId: mockWorkspaceId,
        priority: "low",
      },
      {
        _id: "task_4",
        _creationTime: Date.now(),
        title: "Task 4",
        status: "done",
        order: 1,
        workspaceId: mockWorkspaceId,
        priority: "medium",
      },
    ];

    const convexReact = await import("convex/react");
    vi.mocked(convexReact.useQuery)
      .mockReturnValueOnce(mockTasks)
      .mockReturnValueOnce([]);

    vi.mocked(convexReact.useAction).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useRealtimeTasks(mockWorkspaceId), {
      wrapper: TestWrapper,
    });

    expect(result.current.stats).toEqual({
      total: 4,
      todo: 2,
      inProgress: 1,
      done: 1,
    });
  });

  test("ローディング状態を正しく管理する", async () => {
    // 最初はundefinedを返してローディング状態をシミュレート
    const convexReact = await import("convex/react");
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);
    vi.mocked(convexReact.useAction).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useRealtimeTasks(mockWorkspaceId), {
      wrapper: TestWrapper,
    });

    expect(result.current.isLoadingTasks).toBe(true);
    expect(result.current.tasks).toEqual([]);
  });

  test("ユーザー情報のキャッシュが正しく動作する", async () => {
    const mockTasks = [
      {
        _id: "task_1",
        _creationTime: Date.now(),
        title: "Task 1",
        status: "todo",
        order: 1,
        workspaceId: mockWorkspaceId,
        assigneeId: "user_123",
        priority: "medium",
      },
    ];

    const mockMembers = [{ id: "user_123" }];

    const convexReact = await import("convex/react");
    vi.mocked(convexReact.useQuery)
      .mockReturnValueOnce(mockTasks)
      .mockReturnValueOnce(mockMembers);

    const mockUserInfo = {
      id: "user_123",
      firstName: "Test",
      lastName: "User",
      imageUrl: "https://example.com/avatar.jpg",
      username: "testuser",
      emailAddress: "test@example.com",
    };

    vi.mocked(convexReact.useAction).mockReturnValue(
      vi.fn().mockResolvedValue(mockUserInfo)
    );

    const { result } = renderHook(() => useRealtimeTasks(mockWorkspaceId), {
      wrapper: TestWrapper,
    });

    // ユーザー情報がキャッシュされるまで待機
    await waitFor(() => {
      expect(result.current.userCache.has("user_123")).toBe(true);
    });

    expect(result.current.userCache.get("user_123")).toEqual(mockUserInfo);
  });
});
