"use client";

import { useState } from "react";
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
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { UserPlus, Mail, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InviteMemberDialogProps {
  workspace: Doc<"workspaces">;
  onInviteSent?: () => Promise<void>;
}

export function InviteMemberDialog({
  workspace,
  onInviteSent,
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingUser, setExistingUser] = useState<any>(null);
  const [checkingUser, setCheckingUser] = useState(false);

  const { user } = useUser();
  const createInvitation = useMutation(api.invitations.createInvitation);
  const checkUserByEmail = useAction(api.invitations.checkUserByEmail);

  // メールアドレスの変更時にユーザーを検索
  const handleEmailChange = async (newEmail: string) => {
    setEmail(newEmail);
    setExistingUser(null);

    if (newEmail && newEmail.includes("@")) {
      setCheckingUser(true);
      try {
        const result = await checkUserByEmail({ email: newEmail });
        if (result.exists) {
          setExistingUser(result);
        }
      } catch (error) {
        console.error("ユーザー検索エラー:", error);
      } finally {
        setCheckingUser(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email || !role) return;

    setIsSubmitting(true);
    try {
      await createInvitation({
        workspaceId: workspace._id,
        email,
        role,
        inviterUserId: user.id,
      });

      // 成功後の処理
      setEmail("");
      setRole("member");
      setExistingUser(null);
      setOpen(false);

      if (onInviteSent) {
        await onInviteSent();
      }

      alert("招待を送信しました！");
    } catch (error) {
      console.error("招待送信エラー:", error);
      alert(
        error instanceof Error
          ? error.message
          : "招待の送信に失敗しました。再試行してください。"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOwner = user?.id === workspace.ownerId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          メンバーを招待
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            メンバーを招待
          </DialogTitle>
          <DialogDescription>
            {workspace.name} ワークスペースに新しいメンバーを招待します。
            招待されたユーザーは、招待リンクからワークスペースに参加できます。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="招待するユーザーのメールアドレス"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            {checkingUser && (
              <p className="text-xs text-muted-foreground">
                ユーザーを検索中...
              </p>
            )}

            {existingUser && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      既存ユーザーです
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-300">
                      {existingUser.firstName && existingUser.lastName
                        ? `${existingUser.firstName} ${existingUser.lastName}`
                        : existingUser.username || existingUser.emailAddress}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {email && !existingUser && !checkingUser && email.includes("@") && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                    <Mail className="w-3 h-3 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      新規ユーザーです
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300">
                      招待リンクから新規アカウントを作成します
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">役割</Label>
            <Select
              value={role}
              onValueChange={(value: "member" | "admin") => setRole(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  <div className="flex items-center gap-2">
                    <span>メンバー</span>
                    <Badge variant="secondary" className="text-xs">
                      一般
                    </Badge>
                  </div>
                </SelectItem>
                {isOwner && (
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Crown className="h-3 w-3" />
                      <span>管理者</span>
                      <Badge variant="destructive" className="text-xs">
                        管理
                      </Badge>
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === "member"
                ? "タスクの作成・編集・削除ができます"
                : "ワークスペースの管理とメンバーの招待ができます"}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting || !email || !role}>
              {isSubmitting ? "送信中..." : "招待を送信"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
