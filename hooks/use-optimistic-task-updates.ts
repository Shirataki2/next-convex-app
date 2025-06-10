"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useState, useCallback } from "react";
import { TaskWithUser } from "./use-realtime-tasks";

interface OptimisticUpdateState {
  isUpdating: boolean;
  error: string | null;
  lastUpdate: number | null;
}

export function useOptimisticTaskUpdates() {
  const { user } = useUser();
  const updateTask = useMutation(api.tasks.updateTask);
  const [updateState, setUpdateState] = useState<OptimisticUpdateState>({
    isUpdating: false,
    error: null,
    lastUpdate: null,
  });

  // タスクステータス更新（楽観的更新付き）
  const updateTaskStatus = useCallback(
    async (
      taskId: Id<"tasks">,
      newStatus: "todo" | "in_progress" | "done",
      newOrder?: number
    ) => {
      if (!user) {
        throw new Error("ユーザーがログインしていません");
      }

      setUpdateState({ isUpdating: true, error: null, lastUpdate: null });

      try {
        const updates: any = { status: newStatus };
        if (newOrder !== undefined) {
          updates.order = newOrder;
        }

        await updateTask({
          taskId,
          updates,
          userId: user.id,
        });

        setUpdateState({
          isUpdating: false,
          error: null,
          lastUpdate: Date.now(),
        });

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "更新に失敗しました";
        setUpdateState({
          isUpdating: false,
          error: errorMessage,
          lastUpdate: null,
        });

        throw error;
      }
    },
    [user, updateTask]
  );

  // タスク順序更新
  const updateTaskOrder = useCallback(
    async (taskId: Id<"tasks">, newOrder: number) => {
      if (!user) {
        throw new Error("ユーザーがログインしていません");
      }

      setUpdateState({ isUpdating: true, error: null, lastUpdate: null });

      try {
        await updateTask({
          taskId,
          updates: { order: newOrder },
          userId: user.id,
        });

        setUpdateState({
          isUpdating: false,
          error: null,
          lastUpdate: Date.now(),
        });

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "順序更新に失敗しました";
        setUpdateState({
          isUpdating: false,
          error: errorMessage,
          lastUpdate: null,
        });

        throw error;
      }
    },
    [user, updateTask]
  );

  // タスク内容更新
  const updateTaskContent = useCallback(
    async (
      taskId: Id<"tasks">,
      updates: {
        title?: string;
        description?: string;
        assigneeId?: string;
        deadline?: string;
        priority?: string;
      }
    ) => {
      if (!user) {
        throw new Error("ユーザーがログインしていません");
      }

      setUpdateState({ isUpdating: true, error: null, lastUpdate: null });

      try {
        await updateTask({
          taskId,
          updates,
          userId: user.id,
        });

        setUpdateState({
          isUpdating: false,
          error: null,
          lastUpdate: Date.now(),
        });

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "タスク更新に失敗しました";
        setUpdateState({
          isUpdating: false,
          error: errorMessage,
          lastUpdate: null,
        });

        throw error;
      }
    },
    [user, updateTask]
  );

  // バッチ更新（複数タスクの順序変更など）
  const batchUpdateTasks = useCallback(
    async (updates: Array<{ taskId: Id<"tasks">; order: number }>) => {
      if (!user) {
        throw new Error("ユーザーがログインしていません");
      }

      setUpdateState({ isUpdating: true, error: null, lastUpdate: null });

      try {
        // 並列実行で高速化
        await Promise.all(
          updates.map(({ taskId, order }) =>
            updateTask({
              taskId,
              updates: { order },
              userId: user.id,
            })
          )
        );

        setUpdateState({
          isUpdating: false,
          error: null,
          lastUpdate: Date.now(),
        });

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "バッチ更新に失敗しました";
        setUpdateState({
          isUpdating: false,
          error: errorMessage,
          lastUpdate: null,
        });

        throw error;
      }
    },
    [user, updateTask]
  );

  // エラーをクリア
  const clearError = useCallback(() => {
    setUpdateState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // アクション
    updateTaskStatus,
    updateTaskOrder,
    updateTaskContent,
    batchUpdateTasks,

    // 状態管理
    clearError,

    // 状態
    isUpdating: updateState.isUpdating,
    error: updateState.error,
    lastUpdate: updateState.lastUpdate,
  };
}
