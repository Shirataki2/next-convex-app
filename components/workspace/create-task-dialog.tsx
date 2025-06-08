"use client";

import { useState, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";

// ユーザー情報の型定義
type WorkspaceMember = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  username: string | null;
  emailAddress?: string;
};

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
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>(
    []
  );
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const { user } = useUser();
  const createTask = useMutation(api.tasks.createTask);
  const getWorkspaceMembers = useAction(api.tasks.getWorkspaceMembers);

  // ワークスペースメンバー情報を取得
  useEffect(() => {
    const fetchMembers = async () => {
      if (!workspaceId) return;

      try {
        setIsLoadingMembers(true);
        const members = await getWorkspaceMembers({ workspaceId });
        setWorkspaceMembers(members);
      } catch (error) {
        console.error("Failed to fetch workspace members:", error);
        // フォールバック：基本のID表示
        setWorkspaceMembers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    if (open) {
      fetchMembers();
    }
  }, [workspaceId, open, getWorkspaceMembers]);

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
                disabled={isCreating || isLoadingMembers}
              >
                <SelectTrigger className="col-span-3">
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
