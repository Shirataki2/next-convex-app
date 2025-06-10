"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Pencil, AlertTriangle } from "lucide-react";
import { ja } from "date-fns/locale";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useTaskLock } from "@/hooks/use-presence";
import { useConflictResolution } from "@/hooks/use-conflict-resolution";
import { ConflictResolutionDialog } from "./conflict-resolution-dialog";
import { ConflictInfo } from "@/hooks/use-conflict-resolution";
import { toast } from "sonner";

// ユーザー情報の型定義
type WorkspaceMember = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  username: string | null;
  emailAddress?: string;
};

interface EditTaskDialogProps {
  task: Doc<"tasks">;
  workspace?: Doc<"workspaces">;
  onTaskChange?: () => Promise<void>;
}

export function EditTaskDialog({
  task,
  workspace,
  onTaskChange,
}: EditTaskDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { user } = useUser();
  const getWorkspaceMembers = useAction(api.tasks.getWorkspaceMembers);
  const { lockTask, unlockTask } = useTaskLock(workspace?._id || "" as any);
  const { updateTaskSafely, currentConflicts } = useConflictResolution(
    workspace?._id || "" as any
  );

  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description || "");
  const [priority, setPriority] = React.useState(task.priority);
  const [assigneeId, setAssigneeId] = React.useState(
    task.assigneeId || "unassigned"
  );
  const [deadline, setDeadline] = React.useState<Date | undefined>(
    task.deadline ? new Date(task.deadline) : undefined
  );
  const [status, setStatus] = React.useState(task.status);
  const [workspaceMembers, setWorkspaceMembers] = React.useState<
    WorkspaceMember[]
  >([]);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false);
  const [taskVersion, setTaskVersion] = React.useState(0);
  const [conflictDialogOpen, setConflictDialogOpen] = React.useState(false);
  const [pendingConflict, setPendingConflict] = React.useState<ConflictInfo | null>(null);

  // ワークスペースメンバー情報を取得
  React.useEffect(() => {
    const fetchMembers = async () => {
      if (!workspace) return;

      try {
        setIsLoadingMembers(true);
        const members = await getWorkspaceMembers({
          workspaceId: workspace._id,
        });
        setWorkspaceMembers(members);
      } catch (error) {
        console.error("Failed to fetch workspace members:", error);
        // フォールバック：基本のID表示
        setWorkspaceMembers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    if (open && workspace) {
      fetchMembers();
    }
  }, [workspace, open, getWorkspaceMembers]);

  // タスクロックの管理
  React.useEffect(() => {
    if (!workspace) return;

    if (open) {
      // ダイアログが開いた時にタスクロックを設定
      lockTask(task._id, "editing");
    } else {
      // ダイアログが閉じた時にタスクロックを解除
      unlockTask(task._id);
    }

    // クリーンアップ（コンポーネントがアンマウントされた時）
    return () => {
      if (open) {
        unlockTask(task._id);
      }
    };
  }, [open, task._id, workspace, lockTask, unlockTask]);

  // タスクのバージョン情報を取得
  React.useEffect(() => {
    if (open && workspace) {
      // 簡易的なバージョン管理：タスクの更新回数を使用
      // 実際のアプリケーションではより詳細なバージョン管理が必要
      setTaskVersion(Math.floor(Date.now() / 1000)); // タイムスタンプをバージョンとして使用
    }
  }, [open, workspace, task._id]);

  // このタスクの競合状況をチェック
  const taskConflicts = currentConflicts.filter(
    (conflict) => conflict.taskId === task._id && !conflict.isResolved
  );

  // ユーザー名を表示するヘルパー関数
  const getUserDisplayName = (member: WorkspaceMember) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName} ${member.lastName}`;
    }
    return member.username || member.emailAddress || "Unknown User";
  };

  // アバターのフォールバック文字を取得するヘルパー関数
  const getAvatarFallback = (member: WorkspaceMember) => {
    const firstName = member.firstName || member.username || "U";
    const lastName = member.lastName || "";
    return (
      firstName.slice(0, 1).toUpperCase() + lastName.slice(0, 1).toUpperCase()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !workspace) return;

    const updates = {
      title,
      description,
      priority,
      status,
      assigneeId: assigneeId !== "unassigned" ? assigneeId : undefined,
      deadline: deadline?.toISOString(),
    };

    try {
      // 競合チェック付きの安全な更新を実行
      const result = await updateTaskSafely(task._id, updates, taskVersion);

      if (result.success) {
        // タスク更新後に親コンポーネントにタスクリストの更新を通知
        if (onTaskChange) {
          await onTaskChange();
        }

        setOpen(false);
      } else if (result.conflict) {
        // 競合が発生した場合は競合解決ダイアログを表示
        setPendingConflict(result.conflict);
        setConflictDialogOpen(true);
      }
    } catch (error) {
      console.error("タスクの更新に失敗しました:", error);
      toast.error("タスクの更新に失敗しました");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>タスクを編集</DialogTitle>
            <DialogDescription>
              タスクの詳細を編集してください
            </DialogDescription>
          </DialogHeader>

          {/* 競合警告 */}
          {taskConflicts.length > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                このタスクには{taskConflicts.length}件の編集競合があります。
                他のユーザーが同時に編集している可能性があります。
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">ステータス</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">未着手</SelectItem>
                  <SelectItem value="in_progress">進行中</SelectItem>
                  <SelectItem value="done">完了</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">優先度</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignee">担当者</Label>
              <Select
                value={assigneeId}
                onValueChange={setAssigneeId}
                disabled={isLoadingMembers}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingMembers
                        ? "メンバー情報を読み込み中..."
                        : "担当者を選択（任意）"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">未指定</SelectItem>
                  {workspaceMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {member.imageUrl ? (
                            <img
                              src={member.imageUrl}
                              alt={getUserDisplayName(member)}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <AvatarFallback className="text-xs">
                              {getAvatarFallback(member)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="text-sm">
                          {getUserDisplayName(member)}
                          {workspace?.ownerId === member.id && " (オーナー)"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>期限</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? (
                      format(deadline, "PPP", { locale: ja })
                    ) : (
                      <span>期限を選択</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">更新</Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* 競合解決ダイアログ */}
      {pendingConflict && (
        <ConflictResolutionDialog
          open={conflictDialogOpen}
          onOpenChange={setConflictDialogOpen}
          conflict={pendingConflict}
          workspaceId={workspace!._id}
          onResolved={() => {
            setConflictDialogOpen(false);
            setPendingConflict(null);
            setOpen(false);
            if (onTaskChange) {
              onTaskChange();
            }
          }}
        />
      )}
    </Dialog>
  );
}
