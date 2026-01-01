"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompleteButton, SnoozeButton } from "@/components/dashboard";
import { Task } from "@/types";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";

interface TaskTableProps {
  tasks: Task[];
  onTaskComplete: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
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

export function TaskTable({ tasks, onTaskComplete, onEdit, onDelete }: TaskTableProps) {
  const today = startOfDay(new Date());

  const getStatusBadge = (task: Task) => {
    if (!task.nextDue) {
      return <Badge variant="secondary">No due date</Badge>;
    }

    const dueDate = parseISO(task.nextDue);

    if (isBefore(dueDate, today)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }

    return null;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Task</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Last Done</TableHead>
            <TableHead>Next Due</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No tasks found
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => {
              const areaColor = areaColors[task.area] || "bg-gray-100 text-gray-800";
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{task.name}</span>
                      {task.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {task.notes}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={areaColor}>
                      {task.area}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{task.frequency}</Badge>
                  </TableCell>
                  <TableCell>
                    {task.lastCompleted
                      ? format(parseISO(task.lastCompleted), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {task.nextDue
                        ? format(parseISO(task.nextDue), "MMM d, yyyy")
                        : "-"}
                      {getStatusBadge(task)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <SnoozeButton taskId={task.id} onSnooze={onTaskComplete} />
                      <CompleteButton taskId={task.id} onComplete={onTaskComplete} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => onEdit(task)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onDelete(task)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
