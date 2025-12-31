"use client";

import { Task, TaskStatus } from "@/types";
import { TaskCard } from "./TaskCard";

interface TaskSectionProps {
  title: string;
  tasks: Task[];
  status: TaskStatus;
  emptyMessage?: string;
  onTaskComplete: () => void;
}

const titleColors: Record<TaskStatus, string> = {
  overdue: "text-red-600",
  today: "text-amber-600",
  upcoming: "text-blue-600",
  future: "text-gray-600",
  adhoc: "text-gray-500",
};

export function TaskSection({
  title,
  tasks,
  status,
  emptyMessage = "No tasks",
  onTaskComplete,
}: TaskSectionProps) {
  return (
    <div className="space-y-3">
      <h2 className={`text-lg font-semibold ${titleColors[status]}`}>
        {title}
        {tasks.length > 0 && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({tasks.length})
          </span>
        )}
      </h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              status={status}
              onComplete={onTaskComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
