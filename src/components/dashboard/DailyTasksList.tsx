"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { areaColors, areaColorFallback } from "@/lib/area-colors";
import { useState } from "react";

interface DailyTasksListProps {
  tasks: Task[];
}


export function DailyTasksList({ tasks }: DailyTasksListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (tasks.length === 0) return null;

  // Group tasks by area
  const tasksByArea = tasks.reduce((acc, task) => {
    if (!acc[task.area]) {
      acc[task.area] = [];
    }
    acc[task.area].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <Card className="bg-gray-50 dark:bg-zinc-900 border-dashed">
      <CardHeader
        className="cursor-pointer py-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-gray-600 dark:text-gray-400">
            Daily Routine
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({tasks.length} tasks)
            </span>
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(tasksByArea).map(([area, areaTasks]) => (
              <div key={area}>
                <Badge
                  variant="secondary"
                  className={`mb-2 ${areaColors[area] || areaColorFallback}`}
                >
                  {area}
                </Badge>
                <ul className="space-y-1">
                  {areaTasks.map((task) => (
                    <li
                      key={task.id}
                      className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                    >
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>
                        {task.name}
                        {task.notes && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                            ({task.notes})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
