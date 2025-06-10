import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { useOptimisticTaskUpdates } from "@/hooks/use-optimistic-task-updates";
import { TestWrapper } from "@/__tests__/utils/test-wrapper";

// Convexのモック
vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
}));

const mockUseMutation = vi.fn();

// Clerkのモック
vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(() => ({
    user: { id: "user_123" },
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useOptimisticTaskUpdates", () => {
  const mockTaskId = "task_123" as any;

  test("タスクステータス更新が正常に動作する", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue({ success: true });
    const convexReact = await import("convex/react");
    vi.mocked(convexReact.useMutation).mockReturnValue(mockUpdateTask);

    const { result } = renderHook(() => useOptimisticTaskUpdates(), {
      wrapper: TestWrapper,
    });

    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBe(null);

    await act(async () => {
      const updateResult = await result.current.updateTaskStatus(
        mockTaskId,
        "in_progress",
        2
      );
      expect(updateResult.success).toBe(true);
    });

    expect(mockUpdateTask).toHaveBeenCalledWith({
      taskId: mockTaskId,
      updates: { status: "in_progress", order: 2 },
      userId: "user_123",
    });

    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.lastUpdate).toBeTruthy();
  });

  test("タスク順序更新が正常に動作する", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue({ success: true });
    const convexReact = await import("convex/react");
    vi.mocked(convexReact.useMutation).mockReturnValue(mockUpdateTask);

    const { result } = renderHook(() => useOptimisticTaskUpdates(), {
      wrapper: TestWrapper,
    });

    await act(async () => {
      const updateResult = await result.current.updateTaskOrder(mockTaskId, 3);
      expect(updateResult.success).toBe(true);
    });

    expect(mockUpdateTask).toHaveBeenCalledWith({
      taskId: mockTaskId,
      updates: { order: 3 },
      userId: "user_123",
    });
  });

  test("タスク内容更新が正常に動作する", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue({ success: true });
    const convexReact = await import("convex/react");
    vi.mocked(convexReact.useMutation).mockReturnValue(mockUpdateTask);

    const { result } = renderHook(() => useOptimisticTaskUpdates(), {
      wrapper: TestWrapper,
    });

    const updates = {
      title: "Updated Title",
      description: "Updated Description",
      priority: "high",
    };

    await act(async () => {
      const updateResult = await result.current.updateTaskContent(
        mockTaskId,
        updates
      );
      expect(updateResult.success).toBe(true);
    });

    expect(mockUpdateTask).toHaveBeenCalledWith({
      taskId: mockTaskId,
      updates,
      userId: "user_123",
    });
  });

  test("バッチ更新が正常に動作する", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue({ success: true });
    const convexReact = await import("convex/react");
    vi.mocked(convexReact.useMutation).mockReturnValue(mockUpdateTask);

    const { result } = renderHook(() => useOptimisticTaskUpdates(), {
      wrapper: TestWrapper,
    });

    const batchUpdates = [
      { taskId: "task_1" as any, order: 1 },
      { taskId: "task_2" as any, order: 2 },
      { taskId: "task_3" as any, order: 3 },
    ];

    await act(async () => {
      const updateResult = await result.current.batchUpdateTasks(batchUpdates);
      expect(updateResult.success).toBe(true);
    });

    expect(mockUpdateTask).toHaveBeenCalledTimes(3);
    expect(mockUpdateTask).toHaveBeenNthCalledWith(1, {
      taskId: "task_1",
      updates: { order: 1 },
      userId: "user_123",
    });
    expect(mockUpdateTask).toHaveBeenNthCalledWith(2, {
      taskId: "task_2",
      updates: { order: 2 },
      userId: "user_123",
    });
    expect(mockUpdateTask).toHaveBeenNthCalledWith(3, {
      taskId: "task_3",
      updates: { order: 3 },
      userId: "user_123",
    });
  });

  test("エラーハンドリングが正しく動作する", async () => {
    const errorMessage = "更新に失敗しました";
    const mockUpdateTask = vi.fn().mockRejectedValue(new Error(errorMessage));
    const convexReact = await import("convex/react");
    vi.mocked(convexReact.useMutation).mockReturnValue(mockUpdateTask);

    const { result } = renderHook(() => useOptimisticTaskUpdates(), {
      wrapper: TestWrapper,
    });

    await act(async () => {
      try {
        await result.current.updateTaskStatus(mockTaskId, "done");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(errorMessage);
      }
    });

    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.lastUpdate).toBe(null);
  });

  test("エラークリア機能が正常に動作する", async () => {
    const mockUpdateTask = vi.fn().mockRejectedValue(new Error("Test error"));
    const convexReact = await import("convex/react");
    vi.mocked(convexReact.useMutation).mockReturnValue(mockUpdateTask);

    const { result } = renderHook(() => useOptimisticTaskUpdates(), {
      wrapper: TestWrapper,
    });

    // エラーを発生させる
    await act(async () => {
      try {
        await result.current.updateTaskStatus(mockTaskId, "done");
      } catch (error) {
        // エラーを無視
      }
    });

    expect(result.current.error).toBeTruthy();

    // エラーをクリア
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  test("ユーザーがログインしていない場合はエラーが発生する", async () => {
    // ユーザーがいない状態をモック
    vi.doMock("@clerk/nextjs", () => ({
      useUser: vi.fn(() => ({ user: null })),
    }));

    const mockUpdateTask = vi.fn();
    const convexReact = await import("convex/react");
    vi.mocked(convexReact.useMutation).mockReturnValue(mockUpdateTask);

    const { result } = renderHook(() => useOptimisticTaskUpdates(), {
      wrapper: TestWrapper,
    });

    await act(async () => {
      try {
        await result.current.updateTaskStatus(mockTaskId, "done");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("ユーザーがログインしていません");
      }
    });

    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  test("更新中状態が正しく管理される", async () => {
    let resolveUpdate: (value: any) => void;
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });

    const mockUpdateTask = vi.fn().mockReturnValue(updatePromise);
    const convexReact = await import("convex/react");
    vi.mocked(convexReact.useMutation).mockReturnValue(mockUpdateTask);

    const { result } = renderHook(() => useOptimisticTaskUpdates(), {
      wrapper: TestWrapper,
    });

    expect(result.current.isUpdating).toBe(false);

    // 更新を開始
    const updatePromiseRef = await act(async () => {
      return result.current.updateTaskStatus(mockTaskId, "in_progress");
    });

    expect(result.current.isUpdating).toBe(true);

    // 更新を完了
    act(() => {
      resolveUpdate!({ success: true });
    });

    await updatePromiseRef;

    expect(result.current.isUpdating).toBe(false);
  });
});
