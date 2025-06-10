import { renderHook, act, waitFor } from "@testing-library/react";
import { usePresence, useTaskLock } from "@/hooks/use-presence";
import { ConvexProvider } from "convex/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { Id } from "@/convex/_generated/dataModel";

// Convexクライアントのモック
const mockConvexClient = new ConvexReactClient("https://test.convex.cloud");

// テスト用のプロバイダー
function TestConvexProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={mockConvexClient}>{children}</ConvexProvider>;
}

// useQueryとuseMutationのモック
jest.mock("convex/react", () => ({
  ...jest.requireActual("convex/react"),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useAction: jest.fn(),
}));

// usePathnameのモック
jest.mock("next/navigation", () => ({
  usePathname: () => "/workspace/test",
}));

describe("usePresence", () => {
  const mockWorkspaceId = "workspaceId123" as Id<"workspaces">;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // DOM APIのモック
    Object.defineProperty(document, "hidden", {
      writable: true,
      value: false,
    });
    
    // イベントリスナーのモック
    document.addEventListener = jest.fn();
    document.removeEventListener = jest.fn();
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  test("プレゼンス情報の初期取得", async () => {
    const mockPresenceAction = jest.fn().mockResolvedValue([
      {
        userId: "user1",
        status: "online",
        lastSeen: Date.now(),
        user: {
          id: "user1",
          firstName: "テスト",
          lastName: "ユーザー",
          imageUrl: "https://example.com/avatar.jpg",
          username: "testuser",
          emailAddress: "test@example.com",
        },
      },
    ]);

    const mockHeartbeatMutation = jest.fn();
    const mockUpdatePresenceMutation = jest.fn();

    const { useAction, useMutation } = require("convex/react");
    useAction.mockReturnValue(mockPresenceAction);
    useMutation
      .mockReturnValueOnce(mockHeartbeatMutation)
      .mockReturnValueOnce(mockUpdatePresenceMutation);

    const { result } = renderHook(() => usePresence(mockWorkspaceId), {
      wrapper: TestConvexProvider,
    });

    // 初期状態の確認
    expect(result.current.loading).toBe(true);
    expect(result.current.presenceData).toEqual([]);

    // プレゼンス情報が取得されるまで待機
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.presenceData).toHaveLength(1);
    expect(result.current.presenceData[0].userId).toBe("user1");
  });

  test("プレゼンス状態の更新", async () => {
    const mockUpdatePresenceMutation = jest.fn();
    const mockPresenceAction = jest.fn().mockResolvedValue([]);
    const mockHeartbeatMutation = jest.fn();

    const { useAction, useMutation } = require("convex/react");
    useAction.mockReturnValue(mockPresenceAction);
    useMutation
      .mockReturnValueOnce(mockHeartbeatMutation)
      .mockReturnValueOnce(mockUpdatePresenceMutation);

    const { result } = renderHook(() => usePresence(mockWorkspaceId), {
      wrapper: TestConvexProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // プレゼンス状態を更新
    const taskId = "taskId123" as Id<"tasks">;
    await act(async () => {
      await result.current.updatePresence("away", taskId);
    });

    expect(mockUpdatePresenceMutation).toHaveBeenCalledWith({
      workspaceId: mockWorkspaceId,
      status: "away",
      currentPage: "/workspace/test",
      isEditing: taskId,
    });
  });

  test("ページ可視性変更の処理", async () => {
    const mockUpdatePresenceMutation = jest.fn();
    const mockPresenceAction = jest.fn().mockResolvedValue([]);
    const mockHeartbeatMutation = jest.fn();

    const { useAction, useMutation } = require("convex/react");
    useAction.mockReturnValue(mockPresenceAction);
    useMutation
      .mockReturnValueOnce(mockHeartbeatMutation)
      .mockReturnValueOnce(mockUpdatePresenceMutation);

    renderHook(() => usePresence(mockWorkspaceId), {
      wrapper: TestConvexProvider,
    });

    // visibilitychangeイベントが登録されていることを確認
    expect(document.addEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });
});

describe("useTaskLock", () => {
  const mockWorkspaceId = "workspaceId123" as Id<"workspaces">;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("タスクロックの設定", async () => {
    const mockSetTaskLockMutation = jest.fn();
    const mockRemoveTaskLockMutation = jest.fn();
    const mockTaskLocks = [
      {
        taskId: "taskId123" as Id<"tasks">,
        userId: "user1",
        lockType: "editing",
        workspaceId: mockWorkspaceId,
        lockedAt: Date.now(),
      },
    ];

    const { useQuery, useMutation } = require("convex/react");
    useQuery.mockReturnValue(mockTaskLocks);
    useMutation
      .mockReturnValueOnce(mockSetTaskLockMutation)
      .mockReturnValueOnce(mockRemoveTaskLockMutation);

    const { result } = renderHook(() => useTaskLock(mockWorkspaceId), {
      wrapper: TestConvexProvider,
    });

    const taskId = "taskId456" as Id<"tasks">;

    // タスクロックを設定
    await act(async () => {
      await result.current.lockTask(taskId, "editing");
    });

    expect(mockSetTaskLockMutation).toHaveBeenCalledWith({
      taskId,
      workspaceId: mockWorkspaceId,
      lockType: "editing",
    });
  });

  test("タスクロックの解除", async () => {
    const mockSetTaskLockMutation = jest.fn();
    const mockRemoveTaskLockMutation = jest.fn();
    const mockTaskLocks: any[] = [];

    const { useQuery, useMutation } = require("convex/react");
    useQuery.mockReturnValue(mockTaskLocks);
    useMutation
      .mockReturnValueOnce(mockSetTaskLockMutation)
      .mockReturnValueOnce(mockRemoveTaskLockMutation);

    const { result } = renderHook(() => useTaskLock(mockWorkspaceId), {
      wrapper: TestConvexProvider,
    });

    const taskId = "taskId123" as Id<"tasks">;

    // タスクロックを解除
    await act(async () => {
      await result.current.unlockTask(taskId);
    });

    expect(mockRemoveTaskLockMutation).toHaveBeenCalledWith({ taskId });
  });

  test("タスクロック状態の確認", () => {
    const taskId = "taskId123" as Id<"tasks">;
    const mockTaskLocks = [
      {
        taskId,
        userId: "user1",
        lockType: "editing",
        workspaceId: mockWorkspaceId,
        lockedAt: Date.now(),
      },
    ];

    const { useQuery, useMutation } = require("convex/react");
    useQuery.mockReturnValue(mockTaskLocks);
    useMutation.mockReturnValue(jest.fn());

    const { result } = renderHook(() => useTaskLock(mockWorkspaceId), {
      wrapper: TestConvexProvider,
    });

    expect(result.current.isTaskLocked(taskId)).toBe(true);
    expect(result.current.getTaskEditor(taskId)).toBe("user1");

    const otherTaskId = "otherTaskId" as Id<"tasks">;
    expect(result.current.isTaskLocked(otherTaskId)).toBe(false);
    expect(result.current.getTaskEditor(otherTaskId)).toBe(null);
  });

  test("編集中ユーザーの取得", () => {
    const taskId = "taskId123" as Id<"tasks">;
    const viewingTaskId = "taskId456" as Id<"tasks">;
    
    const mockTaskLocks = [
      {
        taskId,
        userId: "user1",
        lockType: "editing",
        workspaceId: mockWorkspaceId,
        lockedAt: Date.now(),
      },
      {
        taskId: viewingTaskId,
        userId: "user2",
        lockType: "viewing",
        workspaceId: mockWorkspaceId,
        lockedAt: Date.now(),
      },
    ];

    const { useQuery, useMutation } = require("convex/react");
    useQuery.mockReturnValue(mockTaskLocks);
    useMutation.mockReturnValue(jest.fn());

    const { result } = renderHook(() => useTaskLock(mockWorkspaceId), {
      wrapper: TestConvexProvider,
    });

    // 編集中のタスクは検出される
    expect(result.current.isTaskLocked(taskId)).toBe(true);
    expect(result.current.getTaskEditor(taskId)).toBe("user1");

    // 閲覧中のタスクは編集ロックとしては検出されない
    expect(result.current.isTaskLocked(viewingTaskId)).toBe(false);
    expect(result.current.getTaskEditor(viewingTaskId)).toBe(null);
  });
});