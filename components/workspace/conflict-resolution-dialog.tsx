"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Clock,
  RefreshCw,
  Save,
  Merge,
  X,
  CheckCircle,
} from "lucide-react";
import {
  ConflictInfo,
  getConflictSuggestions,
  useConflictResolution,
} from "@/hooks/use-conflict-resolution";
import { Id } from "@/convex/_generated/dataModel";

// ユーザー情報の型定義
type UserInfo = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  emailAddress?: string;
};

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ConflictInfo;
  workspaceId: Id<"workspaces">;
  onResolved?: () => void;
}

function getConflictTypeLabel(type: string): string {
  switch (type) {
    case "simultaneous_edit":
      return "同時編集";
    case "stale_data":
      return "古いデータ";
    case "permission_denied":
      return "権限なし";
    default:
      return "不明";
  }
}

function getConflictTypeColor(type: string): string {
  switch (type) {
    case "simultaneous_edit":
      return "destructive";
    case "stale_data":
      return "secondary";
    case "permission_denied":
      return "destructive";
    default:
      return "outline";
  }
}

function getUserDisplayName(user: UserInfo | null): string {
  if (!user) return "不明なユーザー";
  if (user.id === "system") return "システム";
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.username || user.emailAddress || "不明なユーザー";
}

function getInitials(user: UserInfo | null): string {
  if (!user) return "?";
  if (user.id === "system") return "SYS";
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

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflict,
  workspaceId,
  onResolved,
}: ConflictResolutionDialogProps) {
  const { resolveTaskConflict, isResolvingConflict } =
    useConflictResolution(workspaceId);
  const [selectedResolution, setSelectedResolution] = useState<"force_save" | "merge" | "discard" | "reload" | null>(
    null
  );

  const suggestions = getConflictSuggestions(conflict.conflictType);

  const handleResolve = async (resolution: "force_save" | "merge" | "discard" | "reload") => {
    try {
      await resolveTaskConflict(conflict.conflictId, resolution);
      onOpenChange(false);
      onResolved?.();
    } catch (error) {
      console.error("競合解決に失敗:", error);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "reload":
        return <RefreshCw className="h-4 w-4" />;
      case "force_save":
        return <Save className="h-4 w-4" />;
      case "merge":
        return <Merge className="h-4 w-4" />;
      case "discard":
        return <X className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            編集競合の解決
          </DialogTitle>
          <DialogDescription>
            タスクの編集中に競合が発生しました。適切な解決方法を選択してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 競合情報 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                競合の詳細
                <Badge
                  variant={getConflictTypeColor(conflict.conflictType) as "default" | "secondary" | "destructive" | "outline"}
                >
                  {getConflictTypeLabel(conflict.conflictType)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {new Date(conflict.timestamp).toLocaleString("ja-JP")}
              </div>

              <Separator />

              {/* 関係ユーザー */}
              <div className="space-y-3">
                <div className="text-sm font-medium">関係するユーザー</div>

                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={conflict.initiatingUser?.imageUrl} />
                    <AvatarFallback className="text-xs">
                      {getInitials(conflict.initiatingUser)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">
                      {getUserDisplayName(conflict.initiatingUser)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      編集を試行したユーザー
                    </div>
                  </div>
                </div>

                {conflict.conflictingUser && (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={conflict.conflictingUser?.imageUrl} />
                      <AvatarFallback className="text-xs">
                        {getInitials(conflict.conflictingUser)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {getUserDisplayName(conflict.conflictingUser)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {conflict.conflictingUser?.id === "system"
                          ? "システム（データ更新）"
                          : "同時編集中のユーザー"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* バージョン情報 */}
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">期待バージョン</div>
                  <div className="text-muted-foreground">
                    v{conflict.initiatingVersion}
                  </div>
                </div>
                <div>
                  <div className="font-medium">現在のバージョン</div>
                  <div className="text-muted-foreground">
                    v{conflict.conflictingVersion}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 解決オプション */}
          <div className="space-y-3">
            <div className="text-sm font-medium">
              解決方法を選択してください
            </div>

            {suggestions.map((suggestion) => (
              <Card
                key={suggestion.action}
                className={`cursor-pointer transition-colors ${
                  selectedResolution === suggestion.action
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                } ${suggestion.recommended ? "border-green-200 bg-green-50" : ""}`}
                onClick={() => setSelectedResolution(suggestion.action)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        suggestion.recommended
                          ? "bg-green-100 text-green-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {getActionIcon(suggestion.action)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{suggestion.label}</div>
                        {suggestion.recommended && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-50 text-green-700 border-green-200"
                          >
                            推奨
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {suggestion.description}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 警告メッセージ */}
          {selectedResolution === "force_save" && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                強制保存を実行すると、他のユーザーの変更が失われる可能性があります。
                本当に実行してもよろしいですか？
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResolvingConflict}
          >
            キャンセル
          </Button>
          <Button
            onClick={() =>
              selectedResolution && handleResolve(selectedResolution)
            }
            disabled={!selectedResolution || isResolvingConflict}
            variant={
              selectedResolution === "force_save" ? "destructive" : "default"
            }
          >
            {isResolvingConflict ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                処理中...
              </>
            ) : (
              "解決する"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
