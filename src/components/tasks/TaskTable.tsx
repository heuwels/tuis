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
import { Pencil, Trash2, FileText } from "lucide-react";
import { areaColors, areaColorFallback } from "@/lib/area-colors";

interface TaskTableProps {
  tasks: Task[];
  onTaskComplete: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onView?: (task: Task) => void;
}


export function TaskTable({ tasks, onTaskComplete, onEdit, onDelete, onView }: TaskTableProps) {
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
    <div className="rounded-md border overflow-x-auto">
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px] max-w-[300px]">Task</TableHead>
            <TableHead className="whitespace-nowrap">Area</TableHead>
            <TableHead className="whitespace-nowrap">Frequency</TableHead>
            <TableHead className="whitespace-nowrap">Last Done</TableHead>
            <TableHead className="whitespace-nowrap">Next Due</TableHead>
            <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
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
              const areaColor = areaColors[task.area] || areaColorFallback;
              return (
                <TableRow key={task.id}>
                  <TableCell className="max-w-[300px]">
                    <div>
                      <span
                        className={`font-medium ${task.extendedNotes && onView ? "cursor-pointer hover:text-blue-600" : ""}`}
                        onClick={task.extendedNotes && onView ? () => onView(task) : undefined}
                      >
                        {task.name}
                      </span>
                      {task.notes && (
                        <p className="text-xs text-muted-foreground mt-1 whitespace-normal break-words">
                          {task.notes}
                        </p>
                      )}
                      {task.extendedNotes && onView && (
                        <button
                          className="inline-flex items-center gap-1 text-xs text-blue-500 mt-1 hover:text-blue-700"
                          onClick={() => onView(task)}
                        >
                          <FileText className="h-3 w-3" />
                          Extended notes
                        </button>
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
                      <CompleteButton taskId={task.id} taskName={task.name} onComplete={onTaskComplete} />
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
                        className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
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
