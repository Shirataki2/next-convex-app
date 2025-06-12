"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Crown,
  User,
  Copy,
} from "lucide-react";

type InviterInfo = {
  firstName?: string;
  lastName?: string;
  username?: string;
  emailAddress?: string;
  imageUrl?: string;
};

interface InvitationListProps {
  workspaceId: Id<"workspaces">;
  workspace: Doc<"workspaces">;
  onInvitationChange?: () => Promise<void>;
}

interface InvitationWithInviter extends Doc<"workspaceInvitations"> {
  inviterInfo?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string;
    username: string | null;
    emailAddress?: string;
  } | null;
}

export function InvitationList({
  workspaceId,
  workspace,
  onInvitationChange,
}: InvitationListProps) {
  const { user } = useUser();
  const invitations = useQuery(api.invitations.getWorkspaceInvitations, {
    workspaceId,
  });
  const revokeInvitation = useMutation(api.invitations.revokeInvitation);
  const getInviterInfo = useAction(api.invitations.getInviterInfo);

  const [invitationsWithInfo, setInvitationsWithInfo] = useState<
    InvitationWithInviter[]
  >([]);
  const [loadingInviters, setLoadingInviters] = useState(true);

  // 招待者の情報を取得
  useEffect(() => {
    const fetchInvitersInfo = async () => {
      if (!invitations) return;

      setLoadingInviters(true);
      const invitationsWithInviterInfo = await Promise.all(
        invitations.map(async (invitation: InvitationWithInviter) => {
          try {
            const inviterInfo = await getInviterInfo({
              inviterUserId: invitation.inviterUserId,
            });
            return { ...invitation, inviterInfo };
          } catch (error) {
            console.error("招待者情報の取得に失敗:", error);
            return { ...invitation, inviterInfo: null };
          }
        })
      );

      setInvitationsWithInfo(invitationsWithInviterInfo);
      setLoadingInviters(false);
    };

    fetchInvitersInfo();
  }, [invitations, getInviterInfo]);

  const handleRevokeInvitation = async (
    invitationId: Id<"workspaceInvitations">
  ) => {
    if (!user) return;

    try {
      await revokeInvitation({
        invitationId,
        userId: user.id,
      });

      if (onInvitationChange) {
        await onInvitationChange();
      }

      alert("招待を取り消しました");
    } catch (error) {
      console.error("招待取り消しエラー:", error);
      alert(
        error instanceof Error ? error.message : "招待の取り消しに失敗しました"
      );
    }
  };

  const copyInvitationLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    alert("招待リンクをコピーしました");
  };

  const getStatusBadge = (status: string, expiresAt: number) => {
    const isExpired = expiresAt < Date.now();

    if (isExpired && status === "pending") {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          期限切れ
        </Badge>
      );
    }

    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            保留中
          </Badge>
        );
      case "accepted":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            承認済み
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            取り消し済み
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge variant="destructive" className="gap-1">
            <Crown className="h-3 w-3" />
            管理者
          </Badge>
        );
      case "member":
        return (
          <Badge variant="secondary" className="gap-1">
            <User className="h-3 w-3" />
            メンバー
          </Badge>
        );
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getUserDisplayName = (inviterInfo: InviterInfo | null) => {
    if (!inviterInfo) return "不明なユーザー";

    if (inviterInfo.firstName && inviterInfo.lastName) {
      return `${inviterInfo.firstName} ${inviterInfo.lastName}`;
    }
    return inviterInfo.username || inviterInfo.emailAddress || "不明なユーザー";
  };

  const isOwner = user?.id === workspace.ownerId;

  if (!invitations) {
    return <div>招待一覧を読み込み中...</div>;
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          招待はありません
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          まだ誰も招待していません。「メンバーを招待」ボタンから招待を送信しましょう。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">送信済み招待</h3>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>招待先</TableHead>
              <TableHead>役割</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>招待者</TableHead>
              <TableHead>招待日時</TableHead>
              <TableHead>有効期限</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitationsWithInfo.map((invitation) => (
              <TableRow key={invitation._id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{invitation.email}</span>
                  </div>
                </TableCell>

                <TableCell>{getRoleBadge(invitation.role)}</TableCell>

                <TableCell>
                  {getStatusBadge(invitation.status, invitation.expiresAt)}
                </TableCell>

                <TableCell>
                  {loadingInviters ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {invitation.inviterInfo?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={invitation.inviterInfo.imageUrl}
                            alt={getUserDisplayName(
                              invitation.inviterInfo as InviterInfo
                            )}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <AvatarFallback className="text-xs">
                            {(invitation.inviterInfo?.firstName || "U")
                              .slice(0, 1)
                              .toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-sm">
                        {getUserDisplayName(
                          invitation.inviterInfo as InviterInfo
                        )}
                      </span>
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {new Date(invitation.createdAt).toLocaleDateString(
                      "ja-JP",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {new Date(invitation.expiresAt).toLocaleDateString(
                      "ja-JP",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </span>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    {invitation.status === "pending" &&
                      invitation.expiresAt > Date.now() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInvitationLink(invitation.token)}
                          className="gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          リンクをコピー
                        </Button>
                      )}

                    {(isOwner || invitation.inviterUserId === user?.id) &&
                      invitation.status === "pending" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              取り消し
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                招待を取り消しますか？
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {invitation.email} への招待を取り消します。
                                この操作は元に戻せません。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleRevokeInvitation(invitation._id)
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                取り消し
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
