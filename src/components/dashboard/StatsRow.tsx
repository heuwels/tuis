"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, CalendarClock, TrendingUp } from "lucide-react";

interface Stats {
  overdueTasks: number;
  tasksDueSoon: number;
  completionsThisWeek: number;
  completionsThisMonth: number;
}

export function StatsRow() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return null;

  const items = [
    {
      label: "Overdue",
      value: stats.overdueTasks,
      icon: AlertTriangle,
      color: stats.overdueTasks > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
      bg: stats.overdueTasks > 0 ? "bg-red-50 dark:bg-red-950" : "bg-green-50 dark:bg-green-950",
    },
    {
      label: "Due this week",
      value: stats.tasksDueSoon,
      icon: CalendarClock,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Done this week",
      value: stats.completionsThisWeek,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950",
    },
    {
      label: "Done this month",
      value: stats.completionsThisMonth,
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="py-0">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`rounded-lg p-2 ${item.bg}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
