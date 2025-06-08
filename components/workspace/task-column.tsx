"use client";

import { TaskCard } from "./task-card";
import { CreateTaskDialog } from "./create-task-dialog";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

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
  const { isOver, setNodeRef } = useDroppable({
    id: status,
    data: {
      type: 'column',
      status: status
    }
  });

  const taskIds = tasks.map((task) => task._id);

  return (
    <div className="flex-1">
      <div className={`mb-4 pb-2 border-b-2 ${color}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{title}</h3>
          <span className="text-sm text-muted-foreground">{tasks.length}</span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[200px] space-y-3 p-4 rounded-lg transition-colors ${isOver ? "bg-muted/50" : ""}`}
      >
        <SortableContext
          items={taskIds}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} workspace={workspace} />
          ))}
        </SortableContext>

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
