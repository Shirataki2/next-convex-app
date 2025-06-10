"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, Users, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TaskColumn } from "@/components/workspace/task-column";
import { WorkspacePresence } from "@/components/workspace/workspace-presence";
import { ConflictMonitor } from "@/components/workspace/conflict-monitor";
import { NotificationPanel } from "@/components/workspace/notification-panel";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useUser } from "@clerk/nextjs";
import { TaskCardOverlay } from "@/components/workspace/task-card-overlay";
import { useRealtimeTasks, TaskWithUser } from "@/hooks/use-realtime-tasks";
import { useOptimisticTaskUpdates } from "@/hooks/use-optimistic-task-updates";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as Id<"workspaces">;
  const { user } = useUser();
  const [activeTask, setActiveTask] = useState<TaskWithUser | null>(null);

  // ワークスペース情報を取得
  const workspace = useQuery(api.workspaces.getWorkspace, { workspaceId });

  // リアルタイムタスクデータ
  const { tasks, groupedTasks, stats, isLoadingTasks, isLoadingUsers } =
    useRealtimeTasks(workspaceId);

  // 楽観的更新とエラーハンドリング
  const {
    updateTaskStatus,
    updateTaskOrder,
    batchUpdateTasks,
    isUpdating,
    error,
    clearError,
  } = useOptimisticTaskUpdates();

  // デバッグ：タスクの変更を監視
  useEffect(() => {
    if (tasks) {
      console.log("リアルタイムタスク更新:", {
        tasksCount: tasks.length,
        todoCount: groupedTasks.todo.length,
        inProgressCount: groupedTasks.inProgress.length,
        doneCount: groupedTasks.done.length,
        timestamp: new Date().toISOString(),
      });
    }
  }, [tasks, groupedTasks]);

  // センサーの設定（マウスとタッチに対応）
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // ドラッグ開始時の処理
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.id as Id<"tasks">;
    const task = tasks?.find((task) => task._id === taskId);

    console.log("ドラッグ開始:", { taskId, task: task?.title });
    setActiveTask(task || null);
  };

  // ドラッグ終了時の処理（リアルタイム対応）
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    console.log("ドラッグ終了:", {
      activeId: active.id,
      overId: over?.id,
      overData: over?.data?.current,
    });

    if (!over || !user || !tasks) {
      console.log("ドラッグキャンセル:", {
        hasOver: !!over,
        hasUser: !!user,
        hasTasks: !!tasks,
      });
      setActiveTask(null);
      return;
    }

    const taskId = active.id as Id<"tasks">;
    let newStatus: "todo" | "in_progress" | "done";
    let overTaskId: Id<"tasks"> | null = null;

    // データ属性を使用してドロップ先を判別
    if (over.data?.current?.type === "column") {
      newStatus = over.data.current.status as "todo" | "in_progress" | "done";
      console.log("カラムにドロップ:", { columnStatus: newStatus });
    } else if (over.data?.current?.type === "task") {
      newStatus = over.data.current.status as "todo" | "in_progress" | "done";
      overTaskId = over.data.current.taskId as Id<"tasks">;
      console.log("タスクカードにドロップ:", {
        overTaskId: over.data.current.taskId,
        taskStatus: newStatus,
      });
    } else {
      // フォールバック: over.idから判別（後方互換性のため）
      const validStatuses = ["todo", "in_progress", "done"];
      if (validStatuses.includes(over.id as string)) {
        newStatus = over.id as "todo" | "in_progress" | "done";
      } else {
        const overTask = tasks.find((task) => task._id === over.id);
        if (!overTask) {
          console.error("ドロップ先が特定できません:", over.id);
          setActiveTask(null);
          return;
        }
        newStatus = overTask.status as "todo" | "in_progress" | "done";
        overTaskId = overTask._id;
      }
      console.log("フォールバック処理でステータスを推定:", { newStatus });
    }

    // 現在のタスクを取得
    const currentTask = tasks.find((task) => task._id === taskId);
    if (!currentTask) {
      console.error("タスクが見つかりません:", taskId);
      setActiveTask(null);
      return;
    }

    // ドラッグ終了時にactiveTaskをクリア
    setActiveTask(null);

    try {
      // 同じステータスにドロップした場合（順序変更）
      if (currentTask.status === newStatus) {
        if (overTaskId && overTaskId !== taskId) {
          const statusTasks =
            groupedTasks[newStatus as keyof typeof groupedTasks];
          const activeIndex = statusTasks.findIndex(
            (task) => task._id === taskId
          );
          const overIndex = statusTasks.findIndex(
            (task) => task._id === overTaskId
          );

          if (
            activeIndex !== -1 &&
            overIndex !== -1 &&
            activeIndex !== overIndex
          ) {
            console.log("順序変更実行:", { activeIndex, overIndex });

            const reorderedTasks = arrayMove(
              statusTasks,
              activeIndex,
              overIndex
            );
            const updatesData = reorderedTasks.map((task, index) => ({
              taskId: task._id,
              order: index + 1,
            }));

            await batchUpdateTasks(updatesData);
            console.log("順序変更完了");
          }
        }
      } else {
        // ステータス変更
        const newStatusTasks =
          groupedTasks[newStatus as keyof typeof groupedTasks];
        const maxOrder = Math.max(
          ...newStatusTasks.map((task) => task.order),
          0
        );

        await updateTaskStatus(taskId, newStatus, maxOrder + 1);
        console.log("ステータス変更完了:", { taskId, newStatus });
      }
    } catch (error) {
      console.error("タスク更新エラー:", error);
      // エラーはuseOptimisticTaskUpdatesフックで処理される
    }
  };

  // ドラッグキャンセル時の処理
  const handleDragCancel = () => {
    console.log("ドラッグキャンセル");
    setActiveTask(null);
  };

  // ローディング状態
  if (workspace === undefined || isLoadingTasks) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header
          breadcrumbs={[
            { label: "ワークスペース一覧", href: "/workspace" },
            { label: "読み込み中..." },
          ]}
        />
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
        <Header
          breadcrumbs={[
            { label: "ワークスペース一覧", href: "/workspace" },
            { label: "ワークスペースが見つかりません" },
          ]}
        />
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
      <Header
        breadcrumbs={[
          { label: "ワークスペース一覧", href: "/workspace" },
          { label: workspace.name },
        ]}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* エラー表示 */}
        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={clearError}>
                閉じる
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* ローディング状態 */}
        {(isUpdating || isLoadingUsers) && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              {isUpdating && "タスクを更新中..."}
              {isLoadingUsers && "ユーザー情報を読み込み中..."}
            </div>
          </div>
        )}

        {/* リアルタイム状態インジケーター */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            リアルタイム同期: 有効
            <span className="ml-2">
              最終更新: {new Date().toLocaleTimeString("ja-JP")}
            </span>
          </div>
        </div>

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
              <NotificationPanel workspaceId={workspaceId} />
              <Link href={`/workspace/${workspaceId}/members`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Users className="h-4 w-4" />
                  メンバー管理
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            ワークスペース: {workspace.name}
          </p>
        </div>

        {/* Kanbanボード */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TaskColumn
              title="Todo"
              tasks={groupedTasks.todo}
              color="border-blue-500"
              workspaceId={workspaceId}
              status="todo"
              workspace={workspace}
              onTaskChange={() => Promise.resolve()}
            />
            <TaskColumn
              title="進行中"
              tasks={groupedTasks.inProgress}
              color="border-yellow-500"
              workspaceId={workspaceId}
              status="in_progress"
              workspace={workspace}
              onTaskChange={() => Promise.resolve()}
            />
            <TaskColumn
              title="完了"
              tasks={groupedTasks.done}
              color="border-green-500"
              workspaceId={workspaceId}
              status="done"
              workspace={workspace}
              onTaskChange={() => Promise.resolve()}
            />
          </div>

          <DragOverlay>
            {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>

        {/* 統計情報、プレゼンス、競合モニター */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-6 gap-6">
          {/* 統計情報 */}
          <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-6">
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
          
          {/* サイドバー */}
          <div className="lg:col-span-2 space-y-6">
            {/* プレゼンス情報 */}
            <WorkspacePresence workspaceId={workspaceId} />
            
            {/* 競合モニター */}
            <ConflictMonitor workspaceId={workspaceId} />
          </div>
        </div>
      </main>
    </div>
  );
}
