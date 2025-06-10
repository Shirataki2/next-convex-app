"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePresence } from "@/hooks/use-presence";
import { Id } from "@/convex/_generated/dataModel";
import { Circle, Edit, Eye } from "lucide-react";

interface WorkspacePresenceProps {
  workspaceId: Id<"workspaces">;
}

interface PresenceUser {
  userId: string;
  status: string;
  lastSeen: number;
  currentPage?: string;
  isEditing?: Id<"tasks">;
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string | null;
    username?: string | null;
    emailAddress?: string | null;
  };
}

function getStatusColor(status: string) {
  switch (status) {
    case "online":
      return "text-green-500";
    case "away":
      return "text-yellow-500";
    case "offline":
    default:
      return "text-gray-400";
  }
}

function getStatusText(status: string) {
  switch (status) {
    case "online":
      return "オンライン";
    case "away":
      return "離席中";
    case "offline":
    default:
      return "オフライン";
  }
}

function getUserDisplayName(user: PresenceUser["user"]) {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.username || user.emailAddress || "不明なユーザー";
}

function getInitials(user: PresenceUser["user"]) {
  if (user.firstName && user.lastName) {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  }
  if (user.username) {
    return user.username.charAt(0).toUpperCase();
  }
  if (user.emailAddress) {
    return user.emailAddress.charAt(0).toUpperCase();
  }
  return "?";
}

function getLastSeenText(lastSeen: number) {
  const now = Date.now();
  const diff = now - lastSeen;
  const minutes = Math.floor(diff / (1000 * 60));
  
  if (minutes < 1) {
    return "たった今";
  } else if (minutes < 60) {
    return `${minutes}分前`;
  } else {
    const hours = Math.floor(minutes / 60);
    return `${hours}時間前`;
  }
}

function getCurrentPageText(currentPage?: string) {
  if (!currentPage) return undefined;
  
  if (currentPage.includes("/workspace/")) {
    if (currentPage.includes("/members")) {
      return "メンバー管理";
    }
    return "ワークスペース";
  }
  
  if (currentPage.includes("/dashboard")) {
    return "ダッシュボード";
  }
  
  return "不明なページ";
}

export function WorkspacePresence({ workspaceId }: WorkspacePresenceProps) {
  const { presenceData, loading, error } = usePresence(workspaceId);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm">メンバーの状態</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">読み込み中...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm">メンバーの状態</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!presenceData || presenceData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm">メンバーの状態</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            オンラインのメンバーはいません
          </div>
        </CardContent>
      </Card>
    );
  }

  // ステータス別にソート（オンライン → 離席中 → オフライン）
  const sortedPresence = [...presenceData].sort((a, b) => {
    const statusOrder = { online: 0, away: 1, offline: 2 };
    const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 3;
    const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 3;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // 同じステータスの場合は最終アクティブ時刻でソート
    return b.lastSeen - a.lastSeen;
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm">
          メンバーの状態 ({presenceData.length}人)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedPresence.map((presence: PresenceUser) => (
          <TooltipProvider key={presence.userId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={presence.user.imageUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(presence.user)}
                      </AvatarFallback>
                    </Avatar>
                    <Circle
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-current ${getStatusColor(
                        presence.status
                      )}`}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {getUserDisplayName(presence.user)}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{getStatusText(presence.status)}</span>
                      <span>•</span>
                      <span>{getLastSeenText(presence.lastSeen)}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-1">
                    {presence.isEditing && (
                      <Badge variant="secondary" className="text-xs">
                        <Edit className="h-3 w-3 mr-1" />
                        編集中
                      </Badge>
                    )}
                    
                    {getCurrentPageText(presence.currentPage) && (
                      <Badge variant="outline" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        {getCurrentPageText(presence.currentPage)}
                      </Badge>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-medium">
                    {getUserDisplayName(presence.user)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ステータス: {getStatusText(presence.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    最終アクティブ: {getLastSeenText(presence.lastSeen)}
                  </div>
                  {presence.currentPage && (
                    <div className="text-sm text-muted-foreground">
                      現在のページ: {getCurrentPageText(presence.currentPage) || presence.currentPage}
                    </div>
                  )}
                  {presence.isEditing && (
                    <div className="text-sm text-blue-600">
                      タスクを編集中
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </CardContent>
    </Card>
  );
}