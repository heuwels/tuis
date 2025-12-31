"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompleteButton } from "./CompleteButton";
import { Task, TaskStatus } from "@/types";
import { format, parseISO } from "date-fns";

interface TaskCardProps {
  task: Task;
  status: TaskStatus;
  onComplete: () => void;
}

const areaColors: Record<string, string> = {
  Kitchen: "bg-orange-100 text-orange-800",
  Bathroom: "bg-blue-100 text-blue-800",
  "Whole house": "bg-purple-100 text-purple-800",
  Garden: "bg-green-100 text-green-800",
  Exterior: "bg-stone-100 text-stone-800",
  Bedrooms: "bg-pink-100 text-pink-800",
  Lounge: "bg-yellow-100 text-yellow-800",
  "Living room": "bg-yellow-100 text-yellow-800",
  Interior: "bg-indigo-100 text-indigo-800",
  Laundry: "bg-cyan-100 text-cyan-800",
};

const statusStyles: Record<TaskStatus, string> = {
  overdue: "border-l-4 border-l-red-500",
  today: "border-l-4 border-l-amber-500",
  upcoming: "border-l-4 border-l-blue-500",
  future: "border-l-4 border-l-gray-300",
  adhoc: "border-l-4 border-l-gray-400 border-dashed",
};

export function TaskCard({ task, status, onComplete }: TaskCardProps) {
  const areaColor = areaColors[task.area] || "bg-gray-100 text-gray-800";

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
        <CompleteButton taskId={task.id} onComplete={onComplete} />
      </CardContent>
    </Card>
  );
}
