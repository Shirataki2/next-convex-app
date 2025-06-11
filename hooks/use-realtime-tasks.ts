"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { useMemo, useEffect, useState, useRef } from "react";
import { createClerkClient } from "@clerk/backend";

// ユーザー情報付きタスクの型定義
export type TaskWithUser = Doc<"tasks"> & {
  assigneeUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string;
    username: string | null;
    emailAddress?: string;
  } | null;
};

// Clerk統合ユーザー情報
type ClerkUserInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  username: string | null;
  emailAddress?: string;
};

export function useRealtimeTasks(workspaceId: Id<"workspaces">) {
  // リアルタイムでタスクデータを取得
  const tasks = useQuery(api.tasks.getWorkspaceTasksRealtime, { workspaceId });

  // ワークスペースメンバー情報を取得
  const members = useQuery(api.tasks.getWorkspaceMembersRealtime, {
    workspaceId,
  });

  // Clerkのユーザー情報を取得するアクション
  const getInviterInfo = useAction(api.invitations.getInviterInfo);

  // ユーザー情報のキャッシュ
  const [userCache, setUserCache] = useState<Map<string, ClerkUserInfo | null>>(
    new Map()
  );
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // 楽観的更新の状態管理
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Map<string, Partial<Doc<"tasks">>>
  >(new Map());
  const optimisticTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // メンバーのユーザー情報を取得
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!members || members.length === 0) return;

      setIsLoadingUsers(true);
      const newCache = new Map(userCache);

      try {
        // 未キャッシュのメンバーのユーザー情報を並列取得
        const uncachedMembers = members.filter(
          (member: any) => !newCache.has(member.id)
        );

        if (uncachedMembers.length > 0) {
          const userInfoPromises = uncachedMembers.map(async (member: any) => {
            try {
              const userInfo = await getInviterInfo({
                inviterUserId: member.id,
              });
              return { id: member.id, userInfo };
            } catch (error: any) {
              // 認証エラーの場合は静かに処理
              if (error?.message?.includes("認証") || error?.message?.includes("authentication")) {
                console.log(`認証が必要です。ユーザー情報取得をスキップします: ${member.id}`);
                return { id: member.id, userInfo: null };
              } else {
                console.error(
                  `Failed to fetch user info for ${member.id}:`,
                  error
                );
                return { id: member.id, userInfo: null };
              }
            }
          });

          const results = await Promise.all(userInfoPromises);

          results.forEach(({ id, userInfo }: any) => {
            newCache.set(id, userInfo);
          });

          setUserCache(newCache);
        }
      } catch (error: any) {
        // 認証エラーの場合は静かに処理
        if (error?.message?.includes("認証") || error?.message?.includes("authentication")) {
          console.log("認証が必要です。ユーザー情報取得をスキップします。");
        } else {
          console.error("Failed to fetch user information:", error);
        }
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUserInfo();
  }, [members, getInviterInfo]);

  // 楽観的更新を適用する関数
  const applyOptimisticUpdate = (
    taskId: string,
    updates: Partial<Doc<"tasks">>
  ) => {
    setOptimisticUpdates((prev) => {
      const newUpdates = new Map(prev);
      const existingUpdate = newUpdates.get(taskId) || {};
      newUpdates.set(taskId, { ...existingUpdate, ...updates });
      return newUpdates;
    });

    // 既存のタイムアウトをクリア
    const existingTimeout = optimisticTimeoutRef.current.get(taskId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // 3秒後に楽観的更新をクリア（リアルタイムデータを信頼）
    const timeout = setTimeout(() => {
      setOptimisticUpdates((prev) => {
        const newUpdates = new Map(prev);
        newUpdates.delete(taskId);
        return newUpdates;
      });
      optimisticTimeoutRef.current.delete(taskId);
    }, 3000);

    optimisticTimeoutRef.current.set(taskId, timeout);
  };

  // 楽観的更新をクリアする関数
  const clearOptimisticUpdate = (taskId: string) => {
    setOptimisticUpdates((prev) => {
      const newUpdates = new Map(prev);
      newUpdates.delete(taskId);
      return newUpdates;
    });

    const timeout = optimisticTimeoutRef.current.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      optimisticTimeoutRef.current.delete(taskId);
    }
  };

  // タスクにユーザー情報を組み合わせ（楽観的更新も適用）
  const tasksWithUsers: TaskWithUser[] = useMemo(() => {
    if (!tasks) return [];

    return tasks.map((task: any) => {
      // 楽観的更新があれば適用
      const optimisticUpdate = optimisticUpdates.get(task._id);
      const updatedTask = optimisticUpdate
        ? { ...task, ...optimisticUpdate }
        : task;

      return {
        ...updatedTask,
        assigneeUser: updatedTask.assigneeId
          ? userCache.get(updatedTask.assigneeId) || null
          : null,
      };
    });
  }, [tasks, userCache, optimisticUpdates]);

  // ステータス別にタスクをグループ化
  const groupedTasks = useMemo(() => {
    return {
      todo: tasksWithUsers
        .filter((task) => task.status === "todo")
        .sort((a, b) => a.order - b.order),
      inProgress: tasksWithUsers
        .filter((task) => task.status === "in_progress")
        .sort((a, b) => a.order - b.order),
      done: tasksWithUsers
        .filter((task) => task.status === "done")
        .sort((a, b) => a.order - b.order),
    };
  }, [tasksWithUsers]);

  // 統計情報を計算
  const stats = useMemo(() => {
    return {
      total: tasksWithUsers.length,
      todo: groupedTasks.todo.length,
      inProgress: groupedTasks.inProgress.length,
      done: groupedTasks.done.length,
    };
  }, [tasksWithUsers, groupedTasks]);

  return {
    // データ
    tasks: tasksWithUsers,
    groupedTasks,
    stats,

    // ローディング状態
    isLoadingTasks: tasks === undefined,
    isLoadingUsers,

    // ユーザー情報
    userCache,

    // 楽観的更新
    applyOptimisticUpdate,
    clearOptimisticUpdate,

    // メタデータ
    lastUpdated: Date.now(),
  };
}
