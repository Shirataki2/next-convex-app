"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Header } from "@/components/layout/header";
import {
  Mail,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  User,
  AlertTriangle,
  UserPlus,
} from "lucide-react";

type InviterInfo = {
  firstName?: string;
  lastName?: string;
  username?: string;
  emailAddress?: string;
  imageUrl?: string;
};

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user, isLoaded } = useUser();

  const [isAccepting, setIsAccepting] = useState(false);
  const [inviterInfo, setInviterInfo] = useState<InviterInfo | null>(null);
  const [loadingInviter, setLoadingInviter] = useState(true);

  // 招待情報を取得
  const invitation = useQuery(api.invitations.getInvitationByToken, { token });
  const acceptInvitation = useMutation(api.invitations.acceptInvitation);
  const getInviterInfo = useAction(api.invitations.getInviterInfo);

  // 招待者情報を取得
  useEffect(() => {
    const fetchInviterInfo = async () => {
      if (!invitation || invitation.expired || !invitation.inviterUserId) {
        setLoadingInviter(false);
        return;
      }

      try {
        const info = await getInviterInfo({
          inviterUserId: invitation.inviterUserId,
        });
        setInviterInfo(info);
      } catch (error) {
        console.error("招待者情報の取得に失敗:", error);
      } finally {
        setLoadingInviter(false);
      }
    };

    fetchInviterInfo();
  }, [invitation, getInviterInfo]);

  const handleAcceptInvitation = async () => {
    if (!user || !invitation) return;

    setIsAccepting(true);
    try {
      const result = await acceptInvitation({
        token,
        userId: user.id,
      });

      if (result.success) {
        // 成功時はワークスペースページにリダイレクト
        router.push(`/workspace/${result.workspaceId}`);
      }
    } catch (error) {
      console.error("招待受け入れエラー:", error);
      alert(
        error instanceof Error ? error.message : "招待の受け入れに失敗しました"
      );
    } finally {
      setIsAccepting(false);
    }
  };

  const getUserDisplayName = (userInfo: InviterInfo | null) => {
    if (!userInfo) return "不明なユーザー";

    if (userInfo.firstName && userInfo.lastName) {
      return `${userInfo.firstName} ${userInfo.lastName}`;
    }
    return userInfo.username || userInfo.emailAddress || "不明なユーザー";
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

  // ローディング状態
  if (!isLoaded || invitation === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="招待を確認中..." />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h2 className="text-xl font-semibold mb-2">
                    招待を確認しています
                  </h2>
                  <p className="text-muted-foreground">少々お待ちください...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // 招待が見つからない場合
  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="招待が見つかりません" />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">
                    招待が見つかりません
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    この招待リンクは無効か、既に使用されています。
                  </p>
                  <Button onClick={() => router.push("/dashboard")}>
                    ダッシュボードに戻る
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // 招待が期限切れの場合
  if (invitation.expired) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="招待の有効期限切れ" />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <Clock className="h-16 w-16 text-orange-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">
                    招待の有効期限が切れています
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    この招待リンクは有効期限が切れています。
                    新しい招待をワークスペースの管理者に依頼してください。
                  </p>
                  <Button onClick={() => router.push("/dashboard")}>
                    ダッシュボードに戻る
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // 招待が既に処理済みの場合
  if (invitation.status !== "pending") {
    const statusMessage = {
      accepted: "この招待は既に受け入れ済みです",
      rejected: "この招待は取り消されています",
    };

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="招待は処理済みです" />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  {invitation.status === "accepted" ? (
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  ) : (
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  )}
                  <h2 className="text-xl font-semibold mb-2">
                    {
                      statusMessage[
                        invitation.status as keyof typeof statusMessage
                      ]
                    }
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {invitation.status === "accepted"
                      ? "既にワークスペースのメンバーになっています。"
                      : "新しい招待をワークスペースの管理者に依頼してください。"}
                  </p>
                  <Button onClick={() => router.push("/dashboard")}>
                    ダッシュボードに戻る
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // ユーザーがサインインしていない場合
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="ワークスペースへの招待" />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  ワークスペースへの招待
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {invitation.workspace?.name} ワークスペース
                  </h3>
                  <p className="text-muted-foreground">
                    {getRoleBadge(invitation.role)} として招待されています
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">招待の詳細</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>招待先: {invitation.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        有効期限:{" "}
                        {new Date(invitation.expiresAt).toLocaleDateString(
                          "ja-JP"
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                  <p className="text-muted-foreground mb-4">
                    招待を受け入れるには、まずサインインまたはアカウントを作成してください。
                  </p>
                  <Button onClick={() => router.push("/login")}>
                    サインイン / アカウント作成
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // メイン画面（招待受け入れ）
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title="ワークスペースへの招待" />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                ワークスペースへの招待
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ワークスペース情報 */}
              <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {invitation.workspace?.name} ワークスペース
                </h3>
                <p className="text-muted-foreground mb-3">
                  {getRoleBadge(invitation.role)} として招待されています
                </p>
              </div>

              {/* 招待者情報 */}
              {loadingInviter ? (
                <div className="p-4 border rounded-lg">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : inviterInfo ? (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">招待者</h4>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {inviterInfo.imageUrl ? (
                        <img
                          src={inviterInfo.imageUrl}
                          alt={getUserDisplayName(inviterInfo)}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <AvatarFallback>
                          {(inviterInfo.firstName || "U")
                            .slice(0, 1)
                            .toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {getUserDisplayName(inviterInfo)}
                      </p>
                      {inviterInfo.emailAddress && (
                        <p className="text-sm text-muted-foreground">
                          {inviterInfo.emailAddress}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* 招待詳細 */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">招待の詳細</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>招待先: {invitation.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      招待日:{" "}
                      {new Date(invitation.createdAt).toLocaleDateString(
                        "ja-JP"
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      有効期限:{" "}
                      {new Date(invitation.expiresAt).toLocaleDateString(
                        "ja-JP"
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAcceptInvitation}
                  disabled={isAccepting}
                  className="flex-1"
                >
                  {isAccepting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      受け入れ中...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      招待を受け入れる
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  disabled={isAccepting}
                  className="flex-1"
                >
                  キャンセル
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                招待を受け入れると、このワークスペースのメンバーとなり、
                タスクの作成・編集・削除ができるようになります。
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
