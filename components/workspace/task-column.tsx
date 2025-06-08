"use client";

import { TaskCard } from "./task-card";
import { CreateTaskDialog } from "./create-task-dialog";
import { Doc, Id } from "@/convex/_generated/dataModel";

interface TaskColumnProps {
  title: string;
  tasks: Doc<"tasks">[];
  color: string;
  workspaceId: Id<"workspaces">;
  status: "todo" | "in_progress" | "done";
  workspace?: Doc<"workspaces">;
}

export function TaskColumn({
  title,
  tasks,
  color,
  workspaceId,
  status,
  workspace,
}: TaskColumnProps) {
  return (
    <div className="flex-1">
      <div className={`mb-4 pb-2 border-b-2 ${color}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{title}</h3>
          <span className="text-sm text-muted-foreground">{tasks.length}</span>
        </div>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} workspace={workspace} />
        ))}

        {/* タスク追加ボタン */}
        <div className="pt-2">
          <CreateTaskDialog
            workspaceId={workspaceId}
            defaultStatus={status}
            workspace={workspace}
          />
        </div>
      </div>
    </div>
  );
}
