"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TaskColumn } from "@/components/workspace/task-column";
import { Id } from "@/convex/_generated/dataModel";
import { useMemo, useState, useEffect } from "react";
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
import { useUser } from "@clerk/nextjs";
import { TaskCardOverlay } from "@/components/workspace/task-card-overlay";
import { Doc } from "@/convex/_generated/dataModel";

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as Id<"workspaces">;
  const { user } = useUser();
  const updateTask = useMutation(api.tasks.updateTask);
  const [activeTask, setActiveTask] = useState<Doc<"tasks"> | null>(null);

  // ワークスペース情報とタスクを取得
  const workspace = useQuery(api.workspaces.getWorkspace, { workspaceId });
  const tasks = useQuery(api.tasks.getWorkspaceTasks, { workspaceId });

  // デバッグ：タスクの変更を監視
  useEffect(() => {
    if (tasks) {
      console.log("タスクが更新されました:", {
        tasksCount: tasks.length,
        todoCount: tasks.filter((t) => t.status === "todo").length,
        inProgressCount: tasks.filter((t) => t.status === "in_progress").length,
        doneCount: tasks.filter((t) => t.status === "done").length,
      });
    }
  }, [tasks]);

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

  // タスクをステータス別にグループ化
  const groupedTasks = useMemo(() => {
    if (!tasks) return { todo: [], inProgress: [], done: [] };

    return {
      todo: tasks.filter((task) => task.status === "todo"),
      inProgress: tasks.filter((task) => task.status === "in_progress"),
      done: tasks.filter((task) => task.status === "done"),
    };
  }, [tasks]);

  // ドラッグ開始時の処理
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.id as Id<"tasks">;
    const task = tasks?.find((task) => task._id === taskId);

    console.log("ドラッグ開始:", { taskId, task: task?.title });
    setActiveTask(task || null);
  };

  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    console.log("ドラッグ終了:", {
      activeId: active.id,
      overId: over?.id,
      overData: over?.data?.current,
    });

    if (!over || !user) {
      console.log("ドラッグキャンセル:", { hasOver: !!over, hasUser: !!user });
      return;
    }

    const taskId = active.id as Id<"tasks">;
    let newStatus: "todo" | "in_progress" | "done";

    // データ属性を使用してドロップ先を判別
    if (over.data?.current?.type === "column") {
      // カラムにドロップした場合
      newStatus = over.data.current.status as "todo" | "in_progress" | "done";
      console.log("カラムにドロップ:", { columnStatus: newStatus });
    } else if (over.data?.current?.type === "task") {
      // タスクカードにドロップした場合
      newStatus = over.data.current.status as "todo" | "in_progress" | "done";
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
        const overTask = tasks?.find((task) => task._id === over.id);
        if (!overTask) {
          console.error("ドロップ先が特定できません:", over.id);
          return;
        }
        newStatus = overTask.status as "todo" | "in_progress" | "done";
      }
      console.log("フォールバック処理でステータスを推定:", { newStatus });
    }

    // 現在のタスクを取得
    const currentTask = tasks?.find((task) => task._id === taskId);
    if (!currentTask) {
      console.error("タスクが見つかりません:", taskId);
      return;
    }

    // 同じステータスにドロップした場合は何もしない（順序の変更は今後実装）
    if (currentTask.status === newStatus) {
      console.log("同じステータスにドロップ:", {
        current: currentTask.status,
        new: newStatus,
      });
      return;
    }

    console.log("タスク更新開始:", {
      taskId,
      currentStatus: currentTask.status,
      newStatus,
      taskTitle: currentTask.title,
    });

    // タスクのステータスを更新
    try {
      await updateTask({
        taskId,
        updates: { status: newStatus },
        userId: user.id,
      });
      console.log("タスク更新成功:", { taskId, newStatus });
    } catch (error) {
      console.error("タスクの更新に失敗しました:", error);
    } finally {
      // ドラッグ終了時にactiveTaskをクリア
      setActiveTask(null);
    }
  };

  // ドラッグキャンセル時の処理
  const handleDragCancel = () => {
    console.log("ドラッグキャンセル");
    setActiveTask(null);
  };

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
            />
            <TaskColumn
              title="進行中"
              tasks={groupedTasks.inProgress}
              color="border-yellow-500"
              workspaceId={workspaceId}
              status="in_progress"
              workspace={workspace}
            />
            <TaskColumn
              title="完了"
              tasks={groupedTasks.done}
              color="border-green-500"
              workspaceId={workspaceId}
              status="done"
              workspace={workspace}
            />
          </div>

          <DragOverlay>
            {activeTask ? (
              <TaskCardOverlay task={activeTask} />
            ) : null}
          </DragOverlay>
        </DndContext>

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
