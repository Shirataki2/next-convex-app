"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TaskColumn } from "@/components/workspace/task-column";
import { Id } from "@/convex/_generated/dataModel";
import { useMemo } from "react";

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as Id<"workspaces">;

  // ワークスペース情報とタスクを取得
  const workspace = useQuery(api.workspaces.getWorkspace, { workspaceId });
  const tasks = useQuery(api.tasks.getWorkspaceTasks, { workspaceId });

  // タスクをステータス別にグループ化
  const groupedTasks = useMemo(() => {
    if (!tasks) return { todo: [], inProgress: [], done: [] };

    return {
      todo: tasks.filter((task) => task.status === "todo"),
      inProgress: tasks.filter((task) => task.status === "in_progress"),
      done: tasks.filter((task) => task.status === "done"),
    };
  }, [tasks]);

  // 統計情報を計算
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, todo: 0, inProgress: 0, done: 0 };

    return {
      total: tasks.length,
      todo: groupedTasks.todo.length,
      inProgress: groupedTasks.inProgress.length,
      done: groupedTasks.done.length,
    };
  }, [tasks, groupedTasks]);

  // ローディング状態
  if (workspace === undefined || tasks === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="タスク管理" />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-8 w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 bg-gray-200 dark:bg-gray-700 rounded"
                ></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // エラー状態
  if (!workspace) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="タスク管理" />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              ワークスペースが見つかりません
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              指定されたワークスペースは存在しないか、アクセス権限がありません。
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title="タスク管理" />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ページヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {workspace.name}
            </h1>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <Clock className="h-3 w-3 mr-1" />
                スプリント 1
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <User className="h-3 w-3 mr-1" />
                チーム: {workspace.members.length}人
              </Badge>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            ワークスペース: {workspace.name}
          </p>
        </div>

        {/* Kanbanボード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TaskColumn
            title="Todo"
            tasks={groupedTasks.todo}
            color="border-blue-500"
          />
          <TaskColumn
            title="進行中"
            tasks={groupedTasks.inProgress}
            color="border-yellow-500"
          />
          <TaskColumn
            title="完了"
            tasks={groupedTasks.done}
            color="border-green-500"
          />
        </div>

        {/* 統計情報 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">総タスク数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {stats.todo}
              </div>
              <p className="text-xs text-muted-foreground">未着手</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.inProgress}
              </div>
              <p className="text-xs text-muted-foreground">進行中</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {stats.done}
              </div>
              <p className="text-xs text-muted-foreground">完了</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
