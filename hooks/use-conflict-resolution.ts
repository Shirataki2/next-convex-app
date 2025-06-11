import { useCallback, useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

export type ConflictType =
  | "simultaneous_edit"
  | "stale_data"
  | "permission_denied";

export interface ConflictInfo {
  conflictId: string;
  taskId: Id<"tasks">;
  workspaceId: Id<"workspaces">;
  conflictType: ConflictType;
  initiatingUserId: string;
  conflictingUserId: string;
  timestamp: number;
  isResolved: boolean;
  resolution?: "force_save" | "merge" | "discard" | "reload";
  initiatingVersion: number;
  conflictingVersion: number;
  metadata?: {
    initiatingChanges: Record<string, any>;
    conflictingChanges: Record<string, any>;
  };
  initiatingUser?: any;
  conflictingUser?: any;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictType?: ConflictType;
  conflictId?: string;
  conflictingUsers?: string[];
  currentVersion: number;
  suggestedActions?: string[];
}

// 競合検出と解決のメインフック
export function useConflictResolution(workspaceId: Id<"workspaces">) {
  const checkForConflicts = useMutation(
    api.conflictResolution.checkForConflicts
  );
  const resolveConflict = useMutation(api.conflictResolution.resolveConflict);
  const updateTaskWithConflictCheck = useMutation(
    api.conflictResolution.updateTaskWithConflictCheck
  );
  const getConflictsWithUserInfo = useAction(
    api.conflictResolution.getConflictsWithUserInfo
  );

  const [currentConflicts, setCurrentConflicts] = useState<ConflictInfo[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);

  // ワークスペースの競合一覧を定期的に取得
  const fetchConflicts = useCallback(async () => {
    try {
      const conflicts = await getConflictsWithUserInfo({ workspaceId });
      setCurrentConflicts(conflicts);
    } catch (error: any) {
      // 認証エラーの場合は静かに処理（トークン期限切れなど）
      if (error?.message?.includes("認証") || error?.message?.includes("authentication")) {
        console.log("認証が必要です。ページをリフレッシュしてください。");
        setCurrentConflicts([]);
      } else {
        console.error("競合情報の取得に失敗:", error);
      }
    }
  }, [getConflictsWithUserInfo, workspaceId]);

  // 定期的に競合をチェック
  useEffect(() => {
    fetchConflicts();
    const interval = setInterval(fetchConflicts, 10000); // 10秒間隔

    return () => clearInterval(interval);
  }, [fetchConflicts]);

  // タスク更新前の競合チェック
  const checkTaskConflict = useCallback(
    async (
      taskId: Id<"tasks">,
      expectedVersion: number,
      proposedChanges: Record<string, any>
    ): Promise<ConflictCheckResult> => {
      setIsCheckingConflicts(true);
      try {
        const result = await checkForConflicts({
          taskId,
          workspaceId,
          expectedVersion,
          proposedChanges,
        });

        if (result.hasConflict) {
          toast.warning("編集競合が検出されました", {
            description: getConflictMessage(result.conflictType),
          });
        }

        return result;
      } catch (error) {
        console.error("競合チェックに失敗:", error);
        toast.error("競合チェックに失敗しました");
        throw error;
      } finally {
        setIsCheckingConflicts(false);
      }
    },
    [checkForConflicts, workspaceId]
  );

  // タスクを安全に更新（競合チェック付き）
  const updateTaskSafely = useCallback(
    async (
      taskId: Id<"tasks">,
      updates: Record<string, any>,
      expectedVersion: number,
      forceUpdate = false
    ) => {
      try {
        await updateTaskWithConflictCheck({
          taskId,
          workspaceId,
          updates,
          expectedVersion,
          forceUpdate,
        });

        toast.success("タスクを更新しました");
        return { success: true };
      } catch (error: any) {
        if (error.message?.includes("CONFLICT_DETECTED")) {
          const conflictData = JSON.parse(error.message);
          const conflict = conflictData.conflict;

          toast.error("編集競合が発生しました", {
            description: getConflictMessage(conflict.conflictType),
          });

          return {
            success: false,
            conflict: conflict,
          };
        } else {
          console.error("タスク更新に失敗:", error);
          toast.error("タスクの更新に失敗しました");
          throw error;
        }
      }
    },
    [updateTaskWithConflictCheck, workspaceId]
  );

  // 競合を解決
  const resolveTaskConflict = useCallback(
    async (
      conflictId: string,
      resolution: "force_save" | "merge" | "discard" | "reload",
      mergedData?: Record<string, any>
    ) => {
      setIsResolvingConflict(true);
      try {
        await resolveConflict({
          conflictId,
          resolution,
          mergedData,
        });

        toast.success("競合を解決しました");

        // 競合一覧を更新
        await fetchConflicts();

        return { success: true };
      } catch (error) {
        console.error("競合解決に失敗:", error);
        toast.error("競合の解決に失敗しました");
        throw error;
      } finally {
        setIsResolvingConflict(false);
      }
    },
    [resolveConflict, fetchConflicts]
  );

  // 特定のタスクの競合を取得
  const getTaskConflicts = useCallback(
    (taskId: Id<"tasks">) => {
      return currentConflicts.filter((conflict) => conflict.taskId === taskId);
    },
    [currentConflicts]
  );

  // タスクに競合があるかチェック
  const hasTaskConflict = useCallback(
    (taskId: Id<"tasks">) => {
      return currentConflicts.some(
        (conflict) => conflict.taskId === taskId && !conflict.isResolved
      );
    },
    [currentConflicts]
  );

  return {
    currentConflicts,
    isCheckingConflicts,
    isResolvingConflict,
    checkTaskConflict,
    updateTaskSafely,
    resolveTaskConflict,
    getTaskConflicts,
    hasTaskConflict,
    refetchConflicts: fetchConflicts,
  };
}

// 特定のタスクの競合状態を監視するフック
export function useTaskConflictStatus(taskId: Id<"tasks">) {
  const taskConflicts = useQuery(api.conflictResolution.getTaskConflicts, {
    taskId,
  });

  const hasActiveConflict = taskConflicts && taskConflicts.length > 0;
  const latestConflict = taskConflicts?.[0]; // 最新の競合

  return {
    hasActiveConflict,
    latestConflict,
    conflictCount: taskConflicts?.length || 0,
    taskConflicts: taskConflicts || [],
  };
}

// 競合タイプに応じたメッセージを生成
function getConflictMessage(conflictType?: ConflictType): string {
  switch (conflictType) {
    case "simultaneous_edit":
      return "他のユーザーが同じタスクを編集中です";
    case "stale_data":
      return "古いデータで編集しようとしています。最新データを再読み込みしてください";
    case "permission_denied":
      return "このタスクを編集する権限がありません";
    default:
      return "不明な競合が発生しました";
  }
}

// 競合解決の提案を生成
export function getConflictSuggestions(conflictType: ConflictType): Array<{
  action: "force_save" | "merge" | "discard" | "reload";
  label: string;
  description: string;
  recommended?: boolean;
}> {
  switch (conflictType) {
    case "simultaneous_edit":
      return [
        {
          action: "reload",
          label: "最新データを再読み込み",
          description: "他のユーザーの変更を確認して、改めて編集してください",
          recommended: true,
        },
        {
          action: "force_save",
          label: "強制保存",
          description: "他のユーザーの変更を上書きして保存します",
        },
        {
          action: "merge",
          label: "変更をマージ",
          description: "両方の変更を統合して保存します",
        },
      ];

    case "stale_data":
      return [
        {
          action: "reload",
          label: "最新データを再読み込み",
          description: "最新のデータを取得して、改めて編集してください",
          recommended: true,
        },
        {
          action: "force_save",
          label: "強制保存",
          description: "現在の変更を強制的に保存します",
        },
      ];

    default:
      return [
        {
          action: "reload",
          label: "再読み込み",
          description: "ページを再読み込みして、最新の状態を確認してください",
          recommended: true,
        },
      ];
  }
}
