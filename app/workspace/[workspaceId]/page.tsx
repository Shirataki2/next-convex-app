"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, User } from "lucide-react";
import { useParams } from "next/navigation";

// 仮のタスクデータ（後でConvexから取得する）
const mockTasks = {
  todo: [
    {
      id: "1",
      title: "プロジェクトのセットアップ",
      description: "開発環境の構築とプロジェクトの初期設定",
      assignee: "田中太郎",
      priority: "high",
      deadline: "2024-01-20",
    },
    {
      id: "2",
      title: "UIデザインの作成",
      description: "ワイヤーフレームとモックアップの作成",
      assignee: "佐藤花子",
      priority: "medium",
      deadline: "2024-01-22",
    },
  ],
  inProgress: [
    {
      id: "3",
      title: "認証機能の実装",
      description: "ユーザー認証とセッション管理の実装",
      assignee: "山田次郎",
      priority: "high",
      deadline: "2024-01-18",
    },
    {
      id: "4",
      title: "データベース設計",
      description: "スキーマ設計とマイグレーションファイルの作成",
      assignee: "田中太郎",
      priority: "medium",
      deadline: "2024-01-19",
    },
  ],
  done: [
    {
      id: "5",
      title: "要件定義書の作成",
      description: "プロジェクトの要件をまとめた文書作成",
      assignee: "鈴木一郎",
      priority: "low",
      deadline: "2024-01-15",
    },
    {
      id: "6",
      title: "技術選定",
      description: "使用するフレームワークとライブラリの選定",
      assignee: "佐藤花子",
      priority: "medium",
      deadline: "2024-01-16",
    },
  ],
};

// タスクカードコンポーネント
function TaskCard({
  task,
}: {
  task: {
    id: string;
    title: string;
    description: string;
    assignee: string;
    priority: string;
    deadline: string;
  };
}) {
  const priorityColors = {
    high: "destructive",
    medium: "secondary",
    low: "default",
  } as const;

  return (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
          <Badge variant={priorityColors[task.priority as keyof typeof priorityColors]}>
            {task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-xs text-muted-foreground mb-3">{task.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {task.assignee.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{task.assignee}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{task.deadline}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// カラムコンポーネント
function TaskColumn({
  title,
  tasks,
  color,
}: {
  title: string;
  tasks: typeof mockTasks.todo;
  color: string;
}) {
  return (
    <div className="flex-1">
      <div className={`mb-4 pb-2 border-b-2 ${color}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{title}</h3>
          <span className="text-sm text-muted-foreground">{tasks.length}</span>
        </div>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title="タスク管理" />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ページヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              プロジェクトタスク
            </h1>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <Clock className="h-3 w-3 mr-1" />
                スプリント 1
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <User className="h-3 w-3 mr-1" />
                チーム: 6人
              </Badge>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            ワークスペースID: {workspaceId}
          </p>
        </div>

        {/* Kanbanボード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TaskColumn
            title="Todo"
            tasks={mockTasks.todo}
            color="border-blue-500"
          />
          <TaskColumn
            title="進行中"
            tasks={mockTasks.inProgress}
            color="border-yellow-500"
          />
          <TaskColumn
            title="完了"
            tasks={mockTasks.done}
            color="border-green-500"
          />
        </div>

        {/* 統計情報（オプション） */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">総タスク数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">2</div>
              <p className="text-xs text-muted-foreground">未着手</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">2</div>
              <p className="text-xs text-muted-foreground">進行中</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">2</div>
              <p className="text-xs text-muted-foreground">完了</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}