"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  CheckCheck,
  Settings,
  Loader2,
  PlusCircle,
  Edit,
  UserCheck,
  CheckCircle,
  MessageCircle,
  UserPlus,
  UserMinus,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import {
  useNotifications,
  useActivityFeed,
  getNotificationPriorityColor,
  getRelativeTime,
  getActivityActionLabel,
  NotificationInfo,
  ActivityInfo,
} from "@/hooks/use-notifications";
import { Id } from "@/convex/_generated/dataModel";

type UserInfo = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  emailAddress?: string;
};

interface NotificationPanelProps {
  workspaceId: Id<"workspaces">;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "task_created":
      return PlusCircle;
    case "task_updated":
      return Edit;
    case "task_assigned":
      return UserCheck;
    case "task_completed":
      return CheckCircle;
    case "task_commented":
    case "comment_added":
      return MessageCircle;
    case "user_joined":
      return UserPlus;
    case "user_left":
      return UserMinus;
    case "conflict_detected":
      return AlertTriangle;
    case "conflict_resolved":
      return ShieldCheck;
    default:
      return Bell;
  }
}

function getUserDisplayName(user: UserInfo | null): string {
  if (!user) return "不明なユーザー";
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.username || user.emailAddress || "不明なユーザー";
}

function getInitials(user: UserInfo | null): string {
  if (!user) return "?";
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

export function NotificationPanel({ workspaceId }: NotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("notifications");

  const {
    notifications,
    unreadCount,
    isLoadingNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    requestNotificationPermission,
  } = useNotifications(workspaceId);

  const { activities, isLoadingActivities } = useActivityFeed(workspaceId);

  const handleNotificationClick = async (notification: NotificationInfo) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification._id);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>通知とアクティビティ</span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="h-7 px-2 text-xs"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    全て既読
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={requestNotificationPermission}
                  className="h-7 px-2"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mx-4 mb-4">
                <TabsTrigger value="notifications" className="text-xs">
                  通知 {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
                <TabsTrigger value="activities" className="text-xs">
                  アクティビティ
                </TabsTrigger>
              </TabsList>

              <TabsContent value="notifications" className="mt-0">
                <ScrollArea className="h-96">
                  {isLoadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <div className="text-sm">通知はありません</div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {notifications.map((notification) => (
                        <NotificationItem
                          key={notification._id}
                          notification={notification}
                          onClick={() => handleNotificationClick(notification)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="activities" className="mt-0">
                <ScrollArea className="h-96">
                  {isLoadingActivities ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <div className="text-sm">アクティビティはありません</div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {activities.map((activity) => (
                        <ActivityItem key={activity._id} activity={activity} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: NotificationInfo;
  onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const IconComponent = getNotificationIcon(notification.type);
  const priorityColor = getNotificationPriorityColor(notification.priority);

  return (
    <div
      className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors border-l-2 ${
        notification.isRead ? "border-l-transparent" : "border-l-primary"
      } ${!notification.isRead ? "bg-blue-50/50" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-full ${priorityColor}`}>
          <IconComponent className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div
                className={`text-sm font-medium ${
                  notification.isRead
                    ? "text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {notification.title}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {notification.message}
              </div>
            </div>

            {!notification.isRead && (
              <div className="h-2 w-2 bg-primary rounded-full ml-2 mt-1" />
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            {notification.senderUser && (
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={notification.senderUser.imageUrl} />
                  <AvatarFallback className="text-xs">
                    {getInitials(notification.senderUser)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {getUserDisplayName(notification.senderUser)}
                </span>
              </div>
            )}

            <span className="text-xs text-muted-foreground">
              {getRelativeTime(notification.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ActivityItemProps {
  activity: ActivityInfo;
}

function ActivityItem({ activity }: ActivityItemProps) {
  return (
    <div className="p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <Avatar className="h-6 w-6">
          <AvatarImage src={activity.user?.imageUrl} />
          <AvatarFallback className="text-xs">
            {getInitials(activity.user)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <span className="font-medium">
              {getUserDisplayName(activity.user)}
            </span>
            <span className="text-muted-foreground ml-1">が</span>
            <span className="font-medium ml-1">
              {activity.task?.title || "タスク"}
            </span>
            <span className="text-muted-foreground ml-1">
              を{getActivityActionLabel(activity.action)}しました
            </span>
          </div>

          <div className="text-xs text-muted-foreground mt-1">
            {getRelativeTime(activity.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}
