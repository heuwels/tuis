"use client";

import { useMemo, useState } from "react";
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
import {
  Pencil,
  Trash2,
  FileText,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { areaColors, areaColorFallback } from "@/lib/area-colors";

interface TaskTableProps {
  tasks: Task[];
  onTaskComplete: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onView?: (task: Task) => void;
}

type SortColumn = "frequency" | "lastCompleted" | "nextDue";
type SortDirection = "asc" | "desc";

const FREQUENCY_RANK: Record<string, number> = {
  daily: 1,
  "twice-weekly": 2,
  weekly: 3,
  fortnightly: 4,
  "bi-weekly": 4,
  monthly: 5,
  quarterly: 6,
  "bi-annually": 7,
  annual: 8,
  annually: 8,
};

function frequencyRank(frequency: string): number {
  return FREQUENCY_RANK[frequency.toLowerCase()] ?? Number.POSITIVE_INFINITY;
}

function compareNullableDates(
  a: string | null,
  b: string | null,
  direction: SortDirection
): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const diff = parseISO(a).getTime() - parseISO(b).getTime();
  return direction === "asc" ? diff : -diff;
}

export function TaskTable({ tasks, onTaskComplete, onEdit, onDelete, onView }: TaskTableProps) {
  const today = startOfDay(new Date());
  const [sortColumn, setSortColumn] = useState<SortColumn>("nextDue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedTasks = useMemo(() => {
    const copy = [...tasks];
    copy.sort((a, b) => {
      if (sortColumn === "frequency") {
        const diff = frequencyRank(a.frequency) - frequencyRank(b.frequency);
        if (diff !== 0) return sortDirection === "asc" ? diff : -diff;
        const nameDiff = a.frequency.localeCompare(b.frequency);
        return sortDirection === "asc" ? nameDiff : -nameDiff;
      }
      if (sortColumn === "lastCompleted") {
        return compareNullableDates(a.lastCompleted, b.lastCompleted, sortDirection);
      }
      return compareNullableDates(a.nextDue, b.nextDue, sortDirection);
    });
    return copy;
  }, [tasks, sortColumn, sortDirection]);

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

  const renderSortIcon = (column: SortColumn) => {
    if (column !== sortColumn) {
      return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
    );
  };

  const ariaSortFor = (column: SortColumn): "ascending" | "descending" | "none" =>
    sortColumn === column ? (sortDirection === "asc" ? "ascending" : "descending") : "none";

  const sortableHeader = (label: string, column: SortColumn) => (
    <button
      type="button"
      onClick={() => handleSort(column)}
      aria-label={`Sort by ${label}`}
      className="inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors"
    >
      {label}
      {renderSortIcon(column)}
    </button>
  );

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px] max-w-[300px]">Task</TableHead>
            <TableHead className="whitespace-nowrap">Area</TableHead>
            <TableHead className="whitespace-nowrap" aria-sort={ariaSortFor("frequency")}>
              {sortableHeader("Frequency", "frequency")}
            </TableHead>
            <TableHead className="whitespace-nowrap" aria-sort={ariaSortFor("lastCompleted")}>
              {sortableHeader("Last Done", "lastCompleted")}
            </TableHead>
            <TableHead className="whitespace-nowrap" aria-sort={ariaSortFor("nextDue")}>
              {sortableHeader("Next Due", "nextDue")}
            </TableHead>
            <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No tasks found
              </TableCell>
            </TableRow>
          ) : (
            sortedTasks.map((task) => {
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
