"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Crown,
  User,
  Mail,
  Calendar,
} from "lucide-react";
import { InviteMemberDialog } from "@/components/workspace/invite-member-dialog";
import { InvitationList } from "@/components/workspace/invitation-list";

// ワークスペースメンバーの型定義
type WorkspaceMember = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  username: string | null;
  emailAddress?: string;
  isOwner: boolean;
  joinedAt?: string;
};

export default function WorkspaceMembersPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as Id<"workspaces">;
  const { user } = useUser();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  // ワークスペース情報を取得
  const workspace = useQuery(api.workspaces.getWorkspace, { workspaceId });

  // ワークスペースメンバーの情報を取得するaction
  const getWorkspaceMembers = useAction(api.tasks.getWorkspaceMembers);

  // メンバー情報を取得
  const fetchMembers = useCallback(async () => {
    if (!workspace) return;

    try {
      setIsLoadingMembers(true);
      const membersInfo = await getWorkspaceMembers({ workspaceId });

      // オーナー情報を含むメンバー一覧を作成
      const membersWithOwnerInfo = membersInfo.map((member: WorkspaceMember) => ({
        ...member,
        isOwner: member.id === workspace.ownerId,
      }));

      // オーナーを最初に表示するようにソート
      membersWithOwnerInfo.sort((a: WorkspaceMember, b: WorkspaceMember) => {
        if (a.isOwner) return -1;
        if (b.isOwner) return 1;
        return 0;
      });

      setMembers(membersWithOwnerInfo);
    } catch (error) {
      console.error("メンバー情報の取得に失敗:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [workspace, workspaceId, getWorkspaceMembers]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // 招待送信後の処理
  const handleInviteSent = async () => {
    // 必要に応じて招待一覧を再読み込み
    // InvitationListコンポーネントが自動的に更新されるため、特別な処理は不要
  };

  // ユーザー名を取得するヘルパー関数
  const getUserDisplayName = (member: WorkspaceMember) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName} ${member.lastName}`;
    }
    return member.username || member.emailAddress || "Unknown User";
  };

  // 権限チェック
  const isOwner = user?.id === workspace?.ownerId;
  const canInvite = isOwner; // 現在はオーナーのみ招待可能

  // ローディング状態
  if (workspace === undefined || isLoadingMembers) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header
          breadcrumbs={[
            { label: "ワークスペース一覧", href: "/workspace" },
            { label: "読み込み中...", href: `/workspace/${workspaceId}` },
            { label: "メンバー管理" },
          ]}
        />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-8 w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-gray-200 dark:bg-gray-700 rounded"
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
          { label: workspace.name, href: `/workspace/${workspaceId}` },
          { label: "メンバー管理" },
        ]}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ページヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Users className="h-8 w-8" />
              メンバー管理
            </h1>
            {canInvite && (
              <InviteMemberDialog
                workspace={workspace}
                onInviteSent={handleInviteSent}
              />
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            {workspace.name} ワークスペースのメンバーと招待を管理します
          </p>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                総メンバー数
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
              <p className="text-xs text-muted-foreground">
                アクティブなメンバー
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">オーナー</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">
                ワークスペース管理者
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                一般メンバー
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length - 1}</div>
              <p className="text-xs text-muted-foreground">コラボレーター</p>
            </CardContent>
          </Card>
        </div>

        {/* メンバー一覧 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              メンバー一覧
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      {member.imageUrl ? (
                        <img
                          src={member.imageUrl}
                          alt={getUserDisplayName(member)}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <AvatarFallback>
                          {(member.firstName || member.username || "U")
                            .slice(0, 1)
                            .toUpperCase()}
                          {(member.lastName || "").slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">
                        {getUserDisplayName(member)}
                      </h3>
                      {member.emailAddress && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.emailAddress}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {member.isOwner ? (
                      <Badge variant="destructive" className="gap-1">
                        <Crown className="h-3 w-3" />
                        オーナー
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <User className="h-3 w-3" />
                        メンバー
                      </Badge>
                    )}

                    {member.joinedAt && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(member.joinedAt).toLocaleDateString("ja-JP")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 招待一覧 */}
        {canInvite && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                招待管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InvitationList
                workspaceId={workspaceId}
                workspace={workspace}
                onInvitationChange={handleInviteSent}
              />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
