"use client";

import { TaskCard } from "./task-card";
import { Doc } from "@/convex/_generated/dataModel";

interface TaskColumnProps {
  title: string;
  tasks: Doc<"tasks">[];
  color: string;
}

export function TaskColumn({ title, tasks, color }: TaskColumnProps) {
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
          <TaskCard key={task._id} task={task} />
        ))}
      </div>
    </div>
  );
}
