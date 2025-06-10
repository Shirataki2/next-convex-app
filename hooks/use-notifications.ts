import { useCallback, useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

export type NotificationType =
  | "task_created"
  | "task_updated"
  | "task_assigned"
  | "task_completed"
  | "task_commented"
  | "user_joined"
  | "user_left"
  | "conflict_detected"
  | "conflict_resolved";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface NotificationInfo {
  _id: Id<"notifications">;
  workspaceId: Id<"workspaces">;
  targetUserId: string;
  senderUserId: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  relatedTaskId?: Id<"tasks">;
  relatedUserId?: string;
  metadata?: any;
  isRead: boolean;
  createdAt: number;
  senderUser?: any;
  relatedUser?: any;
}

export interface ActivityInfo {
  _id: Id<"taskActivities">;
  workspaceId: Id<"workspaces">;
  userId: string;
  taskId: Id<"tasks">;
  action: string;
  timestamp: number;
  user?: any;
  task?: any;
}

// 通知管理フック
export function useNotifications(workspaceId?: Id<"workspaces">) {
  const [lastNotificationCount, setLastNotificationCount] = useState(0);

  // 通知関連のmutation/action
  const markAsRead = useMutation(api.notifications.markNotificationAsRead);
  const markAllAsRead = useMutation(
    api.notifications.markAllNotificationsAsRead
  );
  const getNotificationsWithUserInfo = useAction(
    api.notifications.getNotificationsWithUserInfo
  );

  // 未読通知数を取得
  const unreadCount = useQuery(
    api.notifications.getUnreadNotificationCount,
    workspaceId ? { workspaceId } : {}
  );

  // 通知一覧を取得（ユーザー情報付き）
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // 通知を取得する関数
  const fetchNotifications = useCallback(
    async (unreadOnly = false) => {
      if (!getNotificationsWithUserInfo) return;

      setIsLoadingNotifications(true);
      try {
        const result = await getNotificationsWithUserInfo(
          workspaceId ? { workspaceId, unreadOnly } : { unreadOnly }
        );
        setNotifications(result);
      } catch (error) {
        console.error("通知の取得に失敗:", error);
        toast.error("通知の取得に失敗しました");
      } finally {
        setIsLoadingNotifications(false);
      }
    },
    [getNotificationsWithUserInfo, workspaceId]
  );

  // 新しい通知があったときの処理
  useEffect(() => {
    if (unreadCount !== undefined && unreadCount > lastNotificationCount) {
      // 新しい通知があったときは自動で最新の通知を取得
      fetchNotifications();

      // 通知音やバイブレーションなどを実装する場合はここに追加
      if (lastNotificationCount > 0) {
        // 初回読み込み時は通知しない
        // ブラウザ通知を表示（許可されている場合）
        if (Notification.permission === "granted") {
          new Notification("新しい通知があります", {
            body: `${unreadCount - lastNotificationCount}件の新しい通知があります`,
            icon: "/favicon.ico",
          });
        }
      }
    }

    if (unreadCount !== undefined) {
      setLastNotificationCount(unreadCount);
    }
  }, [unreadCount, lastNotificationCount, fetchNotifications]);

  // 通知を既読にマーク
  const markNotificationAsRead = useCallback(
    async (notificationId: Id<"notifications">) => {
      try {
        await markAsRead({ notificationId });

        // ローカル状態を更新
        setNotifications((prev) =>
          prev.map((notification) =>
            notification._id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        );
      } catch (error) {
        console.error("通知の既読マークに失敗:", error);
        toast.error("通知の既読マークに失敗しました");
      }
    },
    [markAsRead]
  );

  // 全通知を既読にマーク
  const markAllNotificationsAsRead = useCallback(async () => {
    if (!workspaceId) return;

    try {
      await markAllAsRead({ workspaceId });

      // ローカル状態を更新
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );

      toast.success("全ての通知を既読にしました");
    } catch (error) {
      console.error("全通知の既読マークに失敗:", error);
      toast.error("全通知の既読マークに失敗しました");
    }
  }, [markAllAsRead, workspaceId]);

  // ブラウザ通知の許可を要求
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("このブラウザは通知をサポートしていません");
      return false;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      toast.success("ブラウザ通知が有効になりました");
      return true;
    } else {
      toast.error("ブラウザ通知が無効です");
      return false;
    }
  }, []);

  return {
    notifications,
    unreadCount: unreadCount || 0,
    isLoadingNotifications,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    requestNotificationPermission,
  };
}

// アクティビティフィード管理フック
export function useActivityFeed(workspaceId: Id<"workspaces">) {
  const getActivityFeedWithUserInfo = useAction(
    api.notifications.getActivityFeedWithUserInfo
  );

  const [activities, setActivities] = useState<ActivityInfo[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // アクティビティを取得する関数
  const fetchActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    try {
      const result = await getActivityFeedWithUserInfo({ workspaceId });
      setActivities(result);
    } catch (error) {
      console.error("アクティビティの取得に失敗:", error);
      toast.error("アクティビティの取得に失敗しました");
    } finally {
      setIsLoadingActivities(false);
    }
  }, [getActivityFeedWithUserInfo, workspaceId]);

  // 定期的にアクティビティを更新
  useEffect(() => {
    fetchActivities();

    // 30秒間隔で更新
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  return {
    activities,
    isLoadingActivities,
    refreshActivities: fetchActivities,
  };
}

// 通知の優先度に応じた色を取得
export function getNotificationPriorityColor(priority: string): string {
  switch (priority) {
    case "urgent":
      return "text-red-600 bg-red-50";
    case "high":
      return "text-orange-600 bg-orange-50";
    case "medium":
      return "text-blue-600 bg-blue-50";
    case "low":
    default:
      return "text-gray-600 bg-gray-50";
  }
}

// 通知タイプに応じたアイコンを取得
export function getNotificationTypeIcon(type: string): string {
  switch (type) {
    case "task_created":
      return "plus-circle";
    case "task_updated":
      return "edit";
    case "task_assigned":
      return "user-check";
    case "task_completed":
      return "check-circle";
    case "task_commented":
      return "message-circle";
    case "user_joined":
      return "user-plus";
    case "user_left":
      return "user-minus";
    case "conflict_detected":
      return "alert-triangle";
    case "conflict_resolved":
      return "shield-check";
    default:
      return "bell";
  }
}

// アクティビティタイプの日本語ラベルを取得
export function getActivityActionLabel(action: string): string {
  switch (action) {
    case "create":
      return "作成";
    case "update":
      return "更新";
    case "delete":
      return "削除";
    case "force_update":
      return "強制更新";
    case "conflict_resolved_force_save":
      return "競合解決（強制保存）";
    case "conflict_resolved_merge":
      return "競合解決（マージ）";
    case "conflict_resolved_discard":
      return "競合解決（破棄）";
    case "conflict_resolved_reload":
      return "競合解決（再読み込み）";
    default:
      return action;
  }
}

// 時間の相対表示を取得
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "たった今";
  } else if (minutes < 60) {
    return `${minutes}分前`;
  } else if (hours < 24) {
    return `${hours}時間前`;
  } else if (days < 7) {
    return `${days}日前`;
  } else {
    return new Date(timestamp).toLocaleDateString("ja-JP");
  }
}
