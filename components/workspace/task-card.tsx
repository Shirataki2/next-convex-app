"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "lucide-react";
import { Doc } from "@/convex/_generated/dataModel";

interface TaskCardProps {
  task: Doc<"tasks">;
}

export function TaskCard({ task }: TaskCardProps) {
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
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
          <Badge
            variant={
              priorityColors[task.priority as keyof typeof priorityColors]
            }
          >
            {priorityLabels[task.priority as keyof typeof priorityLabels]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-xs text-muted-foreground mb-6">{task.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.assigneeId && (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {task.assigneeId.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {task.assigneeId}
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
