"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";

interface CreateTaskDialogProps {
  workspaceId: Id<"workspaces">;
  defaultStatus: "todo" | "in_progress" | "done";
  workspace?: Doc<"workspaces">;
  children?: React.ReactNode;
  onTaskChange?: () => Promise<void>;
}

export function CreateTaskDialog({
  workspaceId,
  defaultStatus,
  workspace,
  children,
  onTaskChange,
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [assigneeId, setAssigneeId] = useState("unassigned");
  const [deadline, setDeadline] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { user } = useUser();
  const createTask = useMutation(api.tasks.createTask);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !title.trim()) return;

    setIsCreating(true);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        status: defaultStatus,
        workspaceId,
        assigneeId:
          assigneeId && assigneeId !== "unassigned" ? assigneeId : undefined,
        deadline: deadline || undefined,
        priority,
        userId: user.id,
      });

      // タスク作成後に親コンポーネントにタスクリストの更新を通知
      if (onTaskChange) {
        await onTaskChange();
      }

      resetForm();
      setOpen(false);
    } catch (error) {
      console.error("タスクの作成に失敗しました:", error);
      // TODO: エラートーストを表示
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssigneeId("unassigned");
    setDeadline("");
    setIsCreating(false);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "todo":
        return "Todo";
      case "in_progress":
        return "進行中";
      case "done":
        return "完了";
      default:
        return status;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            タスクを追加
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新しいタスクを作成</DialogTitle>
            <DialogDescription>
              {getStatusLabel(defaultStatus)}カラムに新しいタスクを追加します。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* タイトル */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                タイトル <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: ユーザー認証機能の実装"
                className="col-span-3"
                disabled={isCreating}
                required
              />
            </div>

            {/* 説明 */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                説明
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="タスクの詳細説明（任意）"
                className="col-span-3"
                disabled={isCreating}
                rows={3}
              />
            </div>

            {/* 優先度 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                優先度
              </Label>
              <Select
                value={priority}
                onValueChange={(value: "high" | "medium" | "low") =>
                  setPriority(value)
                }
                disabled={isCreating}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 担当者 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignee" className="text-right">
                担当者
              </Label>
              <Select
                value={assigneeId}
                onValueChange={(value) => setAssigneeId(value)}
                disabled={isCreating}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="担当者を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">未指定</SelectItem>
                  {workspace?.members.map((memberId) => (
                    <SelectItem key={memberId} value={memberId}>
                      {memberId}
                    </SelectItem>
                  ))}
                  {workspace?.ownerId &&
                    !workspace.members.includes(workspace.ownerId) && (
                      <SelectItem value={workspace.ownerId}>
                        {workspace.ownerId} (オーナー)
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>

            {/* 期限 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deadline" className="text-right">
                期限
              </Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="col-span-3"
                disabled={isCreating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isCreating || !title.trim()}>
              {isCreating ? "作成中..." : "作成"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
