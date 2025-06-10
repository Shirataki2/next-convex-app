"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTaskLock } from "@/hooks/use-presence";
import { Id } from "@/convex/_generated/dataModel";
import { Edit3, Eye } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";

interface TaskLockIndicatorProps {
  taskId: Id<"tasks">;
  workspaceId: Id<"workspaces">;
  className?: string;
}

interface UserInfo {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  username?: string | null;
  emailAddress?: string | null;
}

interface PresenceWithUser {
  userId: string;
  workspaceId: string;
  status: string;
  lastSeen: number;
  currentPage?: string;
  isEditing?: string;
  user?: UserInfo;
}

interface TaskLock {
  taskId: string;
  userId: string;
  workspaceId: string;
  lockedAt: number;
  lockType: string;
}

export function TaskLockIndicator({
  taskId,
  workspaceId,
  className = "",
}: TaskLockIndicatorProps) {
  const { isTaskLocked, getTaskEditor } = useTaskLock(workspaceId);
  const [editorInfo, setEditorInfo] = useState<UserInfo | null>(null);
  const getUserInfo = useAction(api.presence.getWorkspacePresenceWithUsers);

  const editorUserId = getTaskEditor(taskId);
  const locked = isTaskLocked(taskId);

  // 編集中のユーザー情報を取得
  useEffect(() => {
    if (editorUserId) {
      getUserInfo({ workspaceId })
        .then((presenceData: PresenceWithUser[]) => {
          const editor = presenceData.find((p: PresenceWithUser) => p.userId === editorUserId);
          if (editor) {
            setEditorInfo(editor.user || null);
          }
        })
        .catch(console.error);
    } else {
      setEditorInfo(null);
    }
  }, [editorUserId, workspaceId, getUserInfo]);

  if (!locked || !editorUserId) {
    return null;
  }

  const getInitials = (user: UserInfo) => {
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
  };

  const getDisplayName = (user: UserInfo) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.emailAddress || "不明なユーザー";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center space-x-1 ${className}`}>
            <Badge
              variant="secondary"
              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              編集中
            </Badge>
            {editorInfo && (
              <Avatar className="h-5 w-5">
                <AvatarImage src={editorInfo.imageUrl || undefined} />
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                  {getInitials(editorInfo)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            {editorInfo ? (
              <>
                <span className="font-medium">
                  {getDisplayName(editorInfo)}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  がこのタスクを編集中です
                </span>
              </>
            ) : (
              "誰かがこのタスクを編集中です"
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// タスクを閲覧中のユーザーも表示する別のコンポーネント
export function TaskViewersIndicator({
  taskId,
  workspaceId,
  className = "",
}: TaskLockIndicatorProps) {
  const { taskLocks } = useTaskLock(workspaceId);
  const [viewersInfo, setViewersInfo] = useState<UserInfo[]>([]);
  const getUserInfo = useAction(api.presence.getWorkspacePresenceWithUsers);

  // 閲覧中のユーザー一覧を取得
  const viewers = taskLocks.filter(
    (lock: TaskLock) => lock.taskId === taskId && lock.lockType === "viewing"
  );

  useEffect(() => {
    if (viewers.length > 0) {
      getUserInfo({ workspaceId })
        .then((presenceData: PresenceWithUser[]) => {
          const viewerUsers = viewers
            .map(
              (viewer: TaskLock) =>
                presenceData.find((p: PresenceWithUser) => p.userId === viewer.userId)?.user
            )
            .filter(Boolean) as UserInfo[];
          setViewersInfo(viewerUsers);
        })
        .catch(console.error);
    } else {
      setViewersInfo([]);
    }
  }, [viewers, workspaceId, getUserInfo]);

  if (viewers.length === 0) {
    return null;
  }

  const getInitials = (user: UserInfo) => {
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
  };

  const getDisplayName = (user: UserInfo) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.emailAddress || "不明なユーザー";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center space-x-1 ${className}`}>
            <Badge variant="outline" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              {viewers.length}人が閲覧中
            </Badge>
            <div className="flex -space-x-1">
              {viewersInfo.slice(0, 3).map((viewer) => (
                <Avatar
                  key={viewer.id}
                  className="h-4 w-4 border border-background"
                >
                  <AvatarImage src={viewer.imageUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(viewer)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {viewersInfo.length > 3 && (
                <div className="h-4 w-4 rounded-full bg-muted border border-background flex items-center justify-center">
                  <span className="text-xs">+{viewersInfo.length - 3}</span>
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-1">
            <div className="font-medium">閲覧中のユーザー:</div>
            {viewersInfo.map((viewer) => (
              <div key={viewer.id}>{getDisplayName(viewer)}</div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
