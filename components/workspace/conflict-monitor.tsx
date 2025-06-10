"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Users,
  Settings,
} from "lucide-react";
import { useConflictResolution, ConflictInfo } from "@/hooks/use-conflict-resolution";
import { ConflictResolutionDialog } from "./conflict-resolution-dialog";
import { Id } from "@/convex/_generated/dataModel";

interface ConflictMonitorProps {
  workspaceId: Id<"workspaces">;
  className?: string;
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

function getConflictSeverity(type: string): "high" | "medium" | "low" {
  switch (type) {
    case "simultaneous_edit":
      return "high";
    case "stale_data":
      return "medium";
    case "permission_denied":
      return "high";
    default:
      return "low";
  }
}

function getSeverityColor(severity: "high" | "medium" | "low"): string {
  switch (severity) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
  }
}

function getUserDisplayName(user: any): string {
  if (!user) return "不明なユーザー";
  if (user.id === "system") return "システム";
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.username || user.emailAddress || "不明なユーザー";
}

function getInitials(user: any): string {
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

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
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

export function ConflictMonitor({ workspaceId, className = "" }: ConflictMonitorProps) {
  const { currentConflicts, refetchConflicts } = useConflictResolution(workspaceId);
  const [selectedConflict, setSelectedConflict] = useState<ConflictInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const activeConflicts = currentConflicts.filter(conflict => !conflict.isResolved);
  const resolvedConflicts = currentConflicts.filter(conflict => conflict.isResolved);

  if (currentConflicts.length === 0) {
    return null; // 競合がない場合は何も表示しない
  }

  return (
    <>
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              編集競合モニター
              {activeConflicts.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {activeConflicts.length}件
                </Badge>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refetchConflicts}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* アクティブな競合 */}
          {activeConflicts.length > 0 ? (
            <div className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {activeConflicts.length}件のアクティブな競合があります。解決が必要です。
                </AlertDescription>
              </Alert>

              {activeConflicts.map((conflict) => (
                <ConflictCard
                  key={conflict.conflictId}
                  conflict={conflict}
                  onResolve={() => setSelectedConflict(conflict)}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              現在、アクティブな競合はありません
            </div>
          )}

          {/* 解決済み競合（折りたたみ式） */}
          {resolvedConflicts.length > 0 && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="text-sm text-muted-foreground">
                    解決済み競合 ({resolvedConflicts.length}件)
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {resolvedConflicts.slice(0, 5).map((conflict) => (
                  <ConflictCard
                    key={conflict.conflictId}
                    conflict={conflict}
                    showResolution
                  />
                ))}
                {resolvedConflicts.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center">
                    他 {resolvedConflicts.length - 5}件
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* 競合解決ダイアログ */}
      {selectedConflict && (
        <ConflictResolutionDialog
          open={!!selectedConflict}
          onOpenChange={(open) => !open && setSelectedConflict(null)}
          conflict={selectedConflict}
          workspaceId={workspaceId}
          onResolved={() => {
            setSelectedConflict(null);
            refetchConflicts();
          }}
        />
      )}
    </>
  );
}

interface ConflictCardProps {
  conflict: ConflictInfo;
  onResolve?: () => void;
  showResolution?: boolean;
}

function ConflictCard({ conflict, onResolve, showResolution = false }: ConflictCardProps) {
  const severity = getConflictSeverity(conflict.conflictType);
  
  return (
    <div className={`p-3 border rounded-lg ${
      conflict.isResolved 
        ? "bg-green-50 border-green-200" 
        : severity === "high" 
        ? "bg-red-50 border-red-200" 
        : "bg-yellow-50 border-yellow-200"
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={getSeverityColor(severity) as any} className="text-xs">
              {getConflictTypeLabel(conflict.conflictType)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {getTimeAgo(conflict.timestamp)}
            </span>
            {showResolution && conflict.resolution && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                {conflict.resolution === "force_save" && "強制保存"}
                {conflict.resolution === "merge" && "マージ"}
                {conflict.resolution === "discard" && "破棄"}
                {conflict.resolution === "reload" && "再読み込み"}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-muted-foreground" />
            <div className="flex items-center gap-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={conflict.initiatingUser?.imageUrl} />
                <AvatarFallback className="text-xs">
                  {getInitials(conflict.initiatingUser)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">
                {getUserDisplayName(conflict.initiatingUser)}
              </span>
            </div>
            {conflict.conflictingUser && (
              <>
                <span className="text-xs text-muted-foreground">vs</span>
                <div className="flex items-center gap-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={conflict.conflictingUser?.imageUrl} />
                    <AvatarFallback className="text-xs">
                      {getInitials(conflict.conflictingUser)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">
                    {getUserDisplayName(conflict.conflictingUser)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {!conflict.isResolved && onResolve && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onResolve}
            className="ml-2"
          >
            解決
          </Button>
        )}
      </div>
    </div>
  );
}