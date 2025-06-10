"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { useMemo, useEffect, useState } from "react";
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

  // メンバーのユーザー情報を取得
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!members || members.length === 0) return;

      setIsLoadingUsers(true);
      const newCache = new Map(userCache);

      try {
        // 未キャッシュのメンバーのユーザー情報を並列取得
        const uncachedMembers = members.filter(
          (member) => !newCache.has(member.id)
        );

        if (uncachedMembers.length > 0) {
          const userInfoPromises = uncachedMembers.map(async (member) => {
            try {
              const userInfo = await getInviterInfo({
                inviterUserId: member.id,
              });
              return { id: member.id, userInfo };
            } catch (error) {
              console.error(
                `Failed to fetch user info for ${member.id}:`,
                error
              );
              return { id: member.id, userInfo: null };
            }
          });

          const results = await Promise.all(userInfoPromises);

          results.forEach(({ id, userInfo }) => {
            newCache.set(id, userInfo);
          });

          setUserCache(newCache);
        }
      } catch (error) {
        console.error("Failed to fetch user information:", error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUserInfo();
  }, [members, getInviterInfo]);

  // タスクにユーザー情報を組み合わせ
  const tasksWithUsers: TaskWithUser[] = useMemo(() => {
    if (!tasks) return [];

    return tasks.map((task) => ({
      ...task,
      assigneeUser: task.assigneeId
        ? userCache.get(task.assigneeId) || null
        : null,
    }));
  }, [tasks, userCache]);

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

    // メタデータ
    lastUpdated: Date.now(),
  };
}
