"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompleteButton } from "./CompleteButton";
import { SnoozeButton } from "./SnoozeButton";
import { Task, TaskStatus } from "@/types";
import { format, parseISO } from "date-fns";
import { areaColors, areaColorFallback } from "@/lib/area-colors";

interface TaskCardProps {
  task: Task;
  status: TaskStatus;
  onComplete: () => void;
}


const statusStyles: Record<TaskStatus, string> = {
  overdue: "border-l-4 border-l-red-500",
  today: "border-l-4 border-l-amber-500",
  upcoming: "border-l-4 border-l-blue-500",
  future: "border-l-4 border-l-gray-300 dark:border-l-gray-600",
  adhoc: "border-l-4 border-l-gray-400 dark:border-l-gray-500 border-dashed",
};

export function TaskCard({ task, status, onComplete }: TaskCardProps) {
  const areaColor = areaColors[task.area] || areaColorFallback;

  return (
    <Card className={`${statusStyles[status]} py-2`}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{task.name}</span>
            <Badge variant="secondary" className={areaColor}>
              {task.area}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {task.frequency}
            </Badge>
          </div>
          {task.notes && (
            <p className="text-sm text-muted-foreground">{task.notes}</p>
          )}
          {task.nextDue && status !== "adhoc" && (
            <p className="text-xs text-muted-foreground mt-1">
              Due: {format(parseISO(task.nextDue), "EEE, MMM d")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <SnoozeButton taskId={task.id} onSnooze={onComplete} />
          <CompleteButton taskId={task.id} taskName={task.name} onComplete={onComplete} />
        </div>
      </CardContent>
    </Card>
  );
}
