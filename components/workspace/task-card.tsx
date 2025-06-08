"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, GripVertical } from "lucide-react";
import { Doc } from "@/convex/_generated/dataModel";
import { EditTaskDialog } from "./edit-task-dialog";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskCardProps {
  task: Doc<"tasks">;
  workspace?: Doc<"workspaces">;
}

export function TaskCard({ task, workspace }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task._id,
    data: {
      type: 'task',
      status: task.status,
      taskId: task._id
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
    <Card
      ref={setNodeRef}
      style={style}
      className={`mb-3 hover:shadow-md transition-shadow ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground"
            >
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
            <div className="flex items-center gap-1">
              <EditTaskDialog task={task} workspace={workspace} />
              <DeleteTaskDialog task={task} />
            </div>
          </div>
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
