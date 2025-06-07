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
import { Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";

interface CreateWorkspaceDialogProps {
  children?: React.ReactNode;
}

export function CreateWorkspaceDialog({
  children,
}: CreateWorkspaceDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useUser();
  const createWorkspace = useMutation(api.workspaces.createWorkspace);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !name.trim()) return;

    setIsCreating(true);
    try {
      await createWorkspace({
        name: name.trim(),
        ownerId: user.id,
      });

      setName("");
      setOpen(false);
    } catch (error) {
      console.error("ワークスペースの作成に失敗しました:", error);
      // TODO: エラートーストを表示
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setName("");
    setIsCreating(false);
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
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規ワークスペース
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新しいワークスペースを作成</DialogTitle>
            <DialogDescription>
              新しいプロジェクトのワークスペースを作成します。
              後でメンバーを招待することができます。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                名前
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: フロントエンド開発"
                className="col-span-3"
                disabled={isCreating}
                required
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
            <Button type="submit" disabled={isCreating || !name.trim()}>
              {isCreating ? "作成中..." : "作成"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
