import { useEffect, useCallback, useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { usePathname } from "next/navigation";

// プレゼンス情報を管理するフック
export function usePresence(workspaceId: Id<"workspaces">) {
  const presenceAction = useAction(api.presence.getWorkspacePresenceWithUsers);
  const heartbeatMutation = useMutation(api.presence.heartbeat);
  const updatePresenceMutation = useMutation(api.presence.updatePresence);
  const pathname = usePathname();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // プレゼンス情報を取得（ポーリング）
  const [presenceData, setPresenceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // プレゼンス情報を定期的に取得
  const fetchPresence = useCallback(async () => {
    try {
      const data = await presenceAction({ workspaceId });
      setPresenceData(data);
      setError(null);
    } catch (err) {
      console.error("プレゼンス情報の取得に失敗:", err);
      setError("プレゼンス情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [presenceAction, workspaceId]);

  // ハートビートを送信
  const sendHeartbeat = useCallback(async () => {
    try {
      await heartbeatMutation({
        workspaceId,
        currentPage: pathname,
      });
    } catch (err) {
      console.error("ハートビートの送信に失敗:", err);
    }
  }, [heartbeatMutation, workspaceId, pathname]);

  // プレゼンス状態を更新
  const updatePresence = useCallback(
    async (status: string, isEditing?: Id<"tasks">) => {
      try {
        await updatePresenceMutation({
          workspaceId,
          status,
          currentPage: pathname,
          isEditing,
        });
      } catch (err) {
        console.error("プレゼンス状態の更新に失敗:", err);
      }
    },
    [updatePresenceMutation, workspaceId, pathname]
  );

  // 初期化とクリーンアップ
  useEffect(() => {
    // 初回取得
    fetchPresence();

    // ハートビートを30秒間隔で送信
    const startHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30 * 1000);
    };

    // プレゼンス情報を5秒間隔で取得
    const presenceInterval = setInterval(fetchPresence, 5 * 1000);

    // 即座にオンライン状態に設定
    updatePresence("online");

    // ハートビート開始
    startHeartbeat();

    // ページの可視性変更を監視
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence("away");
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      } else {
        updatePresence("online");
        startHeartbeat();
      }
    };

    // ページアンロード時にオフライン状態に設定
    const handleBeforeUnload = () => {
      updatePresence("offline");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // クリーンアップ
      clearInterval(presenceInterval);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // オフライン状態に設定
      updatePresence("offline");
    };
  }, [fetchPresence, sendHeartbeat, updatePresence]);

  return {
    presenceData,
    loading,
    error,
    updatePresence,
    refetch: fetchPresence,
  };
}

// タスクロック機能を管理するフック
export function useTaskLock(workspaceId: Id<"workspaces">) {
  const setTaskLockMutation = useMutation(api.presence.setTaskLock);
  const removeTaskLockMutation = useMutation(api.presence.removeTaskLock);
  const taskLocks = useQuery(api.presence.getWorkspaceTaskLocks, {
    workspaceId,
  });

  // タスクロックを設定
  const lockTask = useCallback(
    async (taskId: Id<"tasks">, lockType: "editing" | "viewing") => {
      try {
        await setTaskLockMutation({
          taskId,
          workspaceId,
          lockType,
        });
      } catch (err) {
        console.error("タスクロックの設定に失敗:", err);
      }
    },
    [setTaskLockMutation, workspaceId]
  );

  // タスクロックを解除
  const unlockTask = useCallback(
    async (taskId: Id<"tasks">) => {
      try {
        await removeTaskLockMutation({ taskId });
      } catch (err) {
        console.error("タスクロックの解除に失敗:", err);
      }
    },
    [removeTaskLockMutation]
  );

  // 特定のタスクが編集中かチェック
  const isTaskLocked = useCallback(
    (taskId: Id<"tasks">) => {
      if (!taskLocks) return false;
      return taskLocks.some(
        (lock) => lock.taskId === taskId && lock.lockType === "editing"
      );
    },
    [taskLocks]
  );

  // 特定のタスクを編集中のユーザーを取得
  const getTaskEditor = useCallback(
    (taskId: Id<"tasks">) => {
      if (!taskLocks) return null;
      const editingLock = taskLocks.find(
        (lock) => lock.taskId === taskId && lock.lockType === "editing"
      );
      return editingLock ? editingLock.userId : null;
    },
    [taskLocks]
  );

  return {
    taskLocks: taskLocks || [],
    lockTask,
    unlockTask,
    isTaskLocked,
    getTaskEditor,
  };
}
