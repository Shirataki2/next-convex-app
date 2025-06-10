"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, GripVertical } from "lucide-react";
import { Doc } from "@/convex/_generated/dataModel";

interface TaskCardOverlayProps {
  task: Doc<"tasks"> & {
    assigneeUser?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      imageUrl: string;
      username: string | null;
      emailAddress?: string;
    } | null;
  };
}

export function TaskCardOverlay({ task }: TaskCardOverlayProps) {
  const priorityColors = {
    high: "destructive",
    medium: "secondary",
    low: "default",
  } as const;

  const priorityLabels = {
    high: "高",
    medium: "中",
    low: "低",
  } as const;

  return (
    <Card className="mb-3 shadow-lg opacity-90 bg-background">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <div className="mt-1 text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                priorityColors[task.priority as keyof typeof priorityColors]
              }
            >
              {priorityLabels[task.priority as keyof typeof priorityLabels]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-xs text-muted-foreground mb-6">{task.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.assigneeUser && (
              <>
                <Avatar className="h-6 w-6">
                  {task.assigneeUser.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={task.assigneeUser.imageUrl}
                      alt={`${task.assigneeUser.firstName || ""} ${task.assigneeUser.lastName || ""}`}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <AvatarFallback className="text-xs">
                      {(
                        task.assigneeUser.firstName ||
                        task.assigneeUser.username ||
                        "U"
                      )
                        .slice(0, 1)
                        .toUpperCase()}
                      {(task.assigneeUser.lastName || "")
                        .slice(0, 1)
                        .toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {task.assigneeUser.firstName && task.assigneeUser.lastName
                    ? `${task.assigneeUser.firstName} ${task.assigneeUser.lastName}`
                    : task.assigneeUser.username ||
                      task.assigneeUser.emailAddress ||
                      "Unknown User"}
                </span>
              </>
            )}
          </div>
          {task.deadline && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{new Date(task.deadline).toLocaleDateString("ja-JP")}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
