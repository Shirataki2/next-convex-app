"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
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
import { arrayMove } from "@dnd-kit/sortable";
import { useUser } from "@clerk/nextjs";
import { TaskCardOverlay } from "@/components/workspace/task-card-overlay";
import { Doc } from "@/convex/_generated/dataModel";

// ユーザー情報付きタスクの型定義
type TaskWithUser = Doc<"tasks"> & {
  assigneeUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string;
    username: string | null;
    emailAddress?: string;
  } | null;
};

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as Id<"workspaces">;
  const { user } = useUser();
  const updateTask = useMutation(api.tasks.updateTask);
  const [activeTask, setActiveTask] = useState<TaskWithUser | null>(null);
  const [tasks, setTasks] = useState<TaskWithUser[] | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  // ワークスペース情報を取得
  const workspace = useQuery(api.workspaces.getWorkspace, { workspaceId });

  // ユーザー情報付きタスクを取得するaction
  const getTasksWithUsers = useAction(api.tasks.getWorkspaceTasksWithUsers);

  // タスクとユーザー情報を取得
  const fetchTasksWithUsers = async () => {
    if (!workspaceId) return;

    try {
      const tasksWithUsers = await getTasksWithUsers({ workspaceId });
      setTasks(tasksWithUsers);
    } catch (error) {
      console.error("Failed to fetch tasks with user info:", error);
      // フォールバック：基本のタスク情報のみ取得（今後実装）
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasksWithUsers();
  }, [workspaceId]);

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

  // タスクをステータス別にグループ化（order順にソート）
  const groupedTasks = useMemo(() => {
    if (!tasks) return { todo: [], inProgress: [], done: [] };

    return {
      todo: tasks
        .filter((task) => task.status === "todo")
        .sort((a, b) => a.order - b.order),
      inProgress: tasks
        .filter((task) => task.status === "in_progress")
        .sort((a, b) => a.order - b.order),
      done: tasks
        .filter((task) => task.status === "done")
        .sort((a, b) => a.order - b.order),
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

  // ドラッグ終了時の処理（楽観的更新対応）
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

    // 同じステータスにドロップした場合（順序変更の可能性）
    if (currentTask.status === newStatus) {
      console.log("同じステータス内でのドロップ:", {
        current: currentTask.status,
        new: newStatus,
        overTaskId,
      });

      // タスクの上にドロップした場合、または同じタスクでない場合は順序を変更
      if (overTaskId && overTaskId !== taskId) {
        const originalTasks = [...tasks];
        const statusTasks = tasks
          .filter((task) => task.status === newStatus)
          .sort((a, b) => a.order - b.order);

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

          // arrayMoveで配列を並び替え
          const reorderedTasks = arrayMove(statusTasks, activeIndex, overIndex);

          // 新しい順序を設定（1から開始）
          const updatedStatusTasks = reorderedTasks.map((task, index) => ({
            ...task,
            order: index + 1,
          }));

          // 他のステータスのタスクと結合
          const otherTasks = tasks.filter((task) => task.status !== newStatus);
          const allUpdatedTasks = [...otherTasks, ...updatedStatusTasks];

          // 楽観的更新
          setTasks(allUpdatedTasks);
          console.log("楽観的更新（順序変更）完了");

          // ドラッグ終了時にactiveTaskをクリア
          setActiveTask(null);

          // バックエンドで順序を更新（非同期）
          try {
            // 全ての順序を更新（simplifiedアプローチ）
            await Promise.all(
              updatedStatusTasks.map((task, index) =>
                updateTask({
                  taskId: task._id,
                  updates: { order: index + 1 },
                  userId: user.id,
                })
              )
            );

            console.log("バックエンド更新成功（順序変更）:", {
              updatedCount: updatedStatusTasks.length,
            });

            // 最新のデータを再取得して同期
            await fetchTasksWithUsers();
            console.log("最新データ同期完了");
          } catch (error) {
            console.error("バックエンド更新に失敗、ロールバック実行:", error);

            // エラー時は楽観的更新をロールバック
            setTasks(originalTasks);
            console.log("楽観的更新をロールバックしました");

            // ユーザーにエラーを通知
            alert("タスクの順序変更に失敗しました。再試行してください。");
          }
        }
      }

      setActiveTask(null);
      return;
    }

    console.log("タスク更新開始（楽観的更新）:", {
      taskId,
      currentStatus: currentTask.status,
      newStatus,
      taskTitle: currentTask.title,
    });

    // 楽観的更新: 即座にローカル状態を更新
    const originalTasks = tasks;
    if (tasks) {
      // 新しいステータスの最大orderを計算
      const newStatusTasks = tasks.filter((task) => task.status === newStatus);
      const maxOrder = Math.max(...newStatusTasks.map((task) => task.order), 0);

      const updatedTasks = tasks.map((task) =>
        task._id === taskId
          ? { ...task, status: newStatus, order: maxOrder + 1 }
          : task
      );
      setTasks(updatedTasks);
      console.log("楽観的更新完了:", {
        taskId,
        newStatus,
        newOrder: maxOrder + 1,
      });
    }

    // ドラッグ終了時にactiveTaskをクリア（楽観的更新後すぐに）
    setActiveTask(null);

    // バックエンドでタスクのステータスを更新（非同期）
    try {
      // 新しいステータスの最大orderを計算（バックエンド用）
      const newStatusTasks =
        tasks?.filter((task) => task.status === newStatus) || [];
      const maxOrder = Math.max(...newStatusTasks.map((task) => task.order), 0);

      await updateTask({
        taskId,
        updates: { status: newStatus, order: maxOrder + 1 },
        userId: user.id,
      });
      console.log("バックエンド更新成功:", {
        taskId,
        newStatus,
        newOrder: maxOrder + 1,
      });

      // バックエンド更新完了後、最新のデータを再取得して同期
      await fetchTasksWithUsers();
      console.log("最新データ同期完了");
    } catch (error) {
      console.error("バックエンド更新に失敗、ロールバック実行:", error);

      // エラー時は楽観的更新をロールバック
      if (originalTasks) {
        setTasks(originalTasks);
        console.log("楽観的更新をロールバックしました");
      }

      // ユーザーにエラーを通知（今後トースト等で実装）
      alert("タスクの更新に失敗しました。再試行してください。");
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
              onTaskChange={fetchTasksWithUsers}
            />
            <TaskColumn
              title="進行中"
              tasks={groupedTasks.inProgress}
              color="border-yellow-500"
              workspaceId={workspaceId}
              status="in_progress"
              workspace={workspace}
              onTaskChange={fetchTasksWithUsers}
            />
            <TaskColumn
              title="完了"
              tasks={groupedTasks.done}
              color="border-green-500"
              workspaceId={workspaceId}
              status="done"
              workspace={workspace}
              onTaskChange={fetchTasksWithUsers}
            />
          </div>

          <DragOverlay>
            {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
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
