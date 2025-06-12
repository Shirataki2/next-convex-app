"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { EditTaskDialog } from "@/components/workspace/edit-task-dialog";
import { DeleteTaskDialog } from "@/components/workspace/delete-task-dialog";
import { TaskComments } from "@/components/workspace/task-comments";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaskDetailDialogProps {
  taskId: Id<"tasks"> | null;
  workspaceId: Id<"workspaces">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailDialog({
  taskId,
  workspaceId,
  open,
  onOpenChange,
}: TaskDetailDialogProps) {
  const { user } = useUser();
  const task = useQuery(api.tasks.getTask, taskId ? { taskId } : "skip");
  const workspace = useQuery(api.workspaces.getWorkspace, { workspaceId });
  const getWorkspaceMembers = useAction(api.tasks.getWorkspaceMembers);

  interface WorkspaceMemberInfo {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    username: string | null;
    emailAddress?: string | null;
  }

  const [members, setMembers] = useState<WorkspaceMemberInfo[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  // メンバー情報を取得
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoadingMembers(true);
        const fetchedMembers = await getWorkspaceMembers({ workspaceId });
        setMembers(fetchedMembers);
      } catch (error) {
        console.error("Failed to fetch members:", error);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    if (open) {
      fetchMembers();
    }
  }, [workspaceId, getWorkspaceMembers, open]);

  // タスクが削除された場合、ダイアログを閉じる
  useEffect(() => {
    if (task === null && taskId) {
      onOpenChange(false);
    }
  }, [task, taskId, onOpenChange]);

  if (!open || !taskId) {
    return null;
  }

  if (!task || isLoadingMembers || !workspace || !user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <Skeleton className="h-8 w-3/4" />
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const assigneeUser = task.assigneeId
    ? members.find((member) => member.id === task.assigneeId)
    : null;

  const statusLabels: Record<string, { label: string; color: string }> = {
    todo: { label: "未着手", color: "bg-gray-500" },
    in_progress: { label: "進行中", color: "bg-blue-500" },
    done: { label: "完了", color: "bg-green-500" },
  };

  const priorityLabels: Record<string, { label: string; color: string }> = {
    low: { label: "低", color: "bg-gray-400" },
    medium: { label: "中", color: "bg-yellow-500" },
    high: { label: "高", color: "bg-red-500" },
  };

  const status = statusLabels[task.status] || statusLabels.todo;
  const priority = priorityLabels[task.priority] || priorityLabels.medium;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <DialogTitle className="text-2xl">{task.title}</DialogTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDistanceToNow(new Date(task._creationTime), {
                    addSuffix: true,
                    locale: ja,
                  })}
                </div>
              </div>
            </div>
            {(user.id === workspace.ownerId || user.id === task.assigneeId) && (
              <div className="flex items-center gap-2 mr-4">
                <EditTaskDialog
                  task={task}
                  workspace={workspace}
                  onTaskChange={async () => {}}
                />
                <DeleteTaskDialog
                  task={task}
                  onTaskChange={async () => onOpenChange(false)}
                />
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 pt-0 space-y-6">
            <div className="flex items-center gap-4">
              <Badge className={`${status.color} text-white`}>
                {status.label}
              </Badge>
              <Badge variant="outline" className="border-2">
                優先度: {priority.label}
              </Badge>
            </div>

            {task.description && (
              <div className="space-y-2">
                <h3 className="font-semibold">説明</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-1">
                  <User className="h-4 w-4" />
                  担当者
                </h3>
                {assigneeUser ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={assigneeUser.imageUrl || undefined}
                        alt={assigneeUser.firstName || ""}
                      />
                      <AvatarFallback>
                        {assigneeUser.firstName?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {assigneeUser.firstName} {assigneeUser.lastName}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    未割り当て
                  </span>
                )}
              </div>

              {task.deadline && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    期限
                  </h3>
                  <span className="text-sm">
                    {new Date(task.deadline).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <TaskComments taskId={taskId} workspaceId={workspaceId} />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
