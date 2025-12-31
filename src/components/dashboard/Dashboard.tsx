"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Task } from "@/types";
import { TaskSection } from "./TaskSection";
import { DailyTasksList } from "./DailyTasksList";
import { parseISO, isToday, isBefore, addDays, startOfDay } from "date-fns";

interface CategorizedTasks {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  adhoc: Task[];
}

function isDaily(task: Task): boolean {
  return task.frequency.toLowerCase() === "daily";
}

function categorizeTasks(tasks: Task[]): CategorizedTasks {
  const now = startOfDay(new Date());
  const weekFromNow = addDays(now, 7);

  const categorized: CategorizedTasks = {
    overdue: [],
    today: [],
    upcoming: [],
    adhoc: [],
  };

  for (const task of tasks) {
    // Skip daily tasks - they're shown separately
    if (isDaily(task)) {
      continue;
    }

    // Ad-hoc tasks (no due date or frequency contains "ad-hoc" or "as needed")
    const isAdhoc =
      !task.nextDue ||
      task.frequency.toLowerCase().includes("ad-hoc") ||
      task.assignedDay?.toLowerCase() === "as needed";

    if (isAdhoc) {
      categorized.adhoc.push(task);
      continue;
    }

    // At this point we know task.nextDue exists (isAdhoc check includes !task.nextDue)
    const dueDate = parseISO(task.nextDue as string);

    if (isToday(dueDate)) {
      categorized.today.push(task);
    } else if (isBefore(dueDate, now)) {
      categorized.overdue.push(task);
    } else if (isBefore(dueDate, weekFromNow)) {
      categorized.upcoming.push(task);
    }
  }

  // Sort overdue by date (oldest first)
  categorized.overdue.sort((a, b) => {
    if (!a.nextDue || !b.nextDue) return 0;
    return parseISO(a.nextDue).getTime() - parseISO(b.nextDue).getTime();
  });

  // Sort upcoming by date
  categorized.upcoming.sort((a, b) => {
    if (!a.nextDue || !b.nextDue) return 0;
    return parseISO(a.nextDue).getTime() - parseISO(b.nextDue).getTime();
  });

  return categorized;
}

export function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks");
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const dailyTasks = useMemo(() => tasks.filter(isDaily), [tasks]);
  const categorized = useMemo(() => categorizeTasks(tasks), [tasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DailyTasksList tasks={dailyTasks} />

      {categorized.overdue.length > 0 && (
        <TaskSection
          title="Overdue"
          tasks={categorized.overdue}
          status="overdue"
          emptyMessage="All caught up!"
          onTaskComplete={fetchTasks}
        />
      )}

      <TaskSection
        title="Today"
        tasks={categorized.today}
        status="today"
        emptyMessage="No tasks due today"
        onTaskComplete={fetchTasks}
      />

      <TaskSection
        title="This Week"
        tasks={categorized.upcoming}
        status="upcoming"
        emptyMessage="No upcoming tasks this week"
        onTaskComplete={fetchTasks}
      />

      {categorized.adhoc.length > 0 && (
        <TaskSection
          title="As Needed"
          tasks={categorized.adhoc}
          status="adhoc"
          emptyMessage="No ad-hoc tasks"
          onTaskComplete={fetchTasks}
        />
      )}
    </div>
  );
}
