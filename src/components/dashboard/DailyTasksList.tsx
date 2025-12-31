"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface DailyTasksListProps {
  tasks: Task[];
}

const areaColors: Record<string, string> = {
  Kitchen: "bg-orange-100 text-orange-800",
  Bathroom: "bg-blue-100 text-blue-800",
  "Whole house": "bg-purple-100 text-purple-800",
  Bedrooms: "bg-pink-100 text-pink-800",
  Lounge: "bg-yellow-100 text-yellow-800",
};

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
    <Card className="bg-gray-50 border-dashed">
      <CardHeader
        className="cursor-pointer py-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-gray-600">
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
                  className={`mb-2 ${areaColors[area] || "bg-gray-100 text-gray-800"}`}
                >
                  {area}
                </Badge>
                <ul className="space-y-1">
                  {areaTasks.map((task) => (
                    <li
                      key={task.id}
                      className="text-sm text-gray-600 flex items-start gap-2"
                    >
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>
                        {task.name}
                        {task.notes && (
                          <span className="text-xs text-gray-400 ml-1">
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
