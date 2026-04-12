"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { format, parseISO, isToday, isYesterday } from "date-fns";

interface RecentCompletion {
  id: number;
  taskId: number;
  taskName: string;
  area: string;
  completedAt: string;
  completedByName: string | null;
}

const areaColors: Record<string, string> = {
  Kitchen: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  Bathroom: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "Whole house": "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  Garden: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  Exterior: "bg-stone-100 text-stone-800 dark:bg-stone-950 dark:text-stone-300",
  Bedrooms: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
  Lounge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  "Living room": "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  Interior: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  Laundry: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
};

function formatCompletionDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d");
}

export function RecentCompletions() {
  const [completions, setCompletions] = useState<RecentCompletion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/stats/recent-completions")
      .then((r) => r.ok ? r.json() : [])
      .then((data: RecentCompletion[]) => {
        setCompletions(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || completions.length === 0) return null;

  // Group by date
  const grouped = completions.reduce((acc, c) => {
    const dateKey = c.completedAt.split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(c);
    return acc;
  }, {} as Record<string, RecentCompletion[]>);

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const visibleDates = isExpanded ? dates : dates.slice(0, 2);

  return (
    <Card className="bg-green-50/50 border-green-100 dark:bg-green-950/30 dark:border-green-900">
      <CardHeader
        className="pb-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Recently Completed
            <span className="text-xs font-normal text-green-600/70 dark:text-green-500/70">
              ({completions.length} this week)
            </span>
          </CardTitle>
          {dates.length > 2 && (
            isExpanded
              ? <ChevronUp className="h-4 w-4 text-green-400 dark:text-green-500" />
              : <ChevronDown className="h-4 w-4 text-green-400 dark:text-green-500" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleDates.map((dateKey) => (
            <div key={dateKey}>
              <p className="text-xs font-medium text-green-600/70 dark:text-green-500/70 mb-1.5">
                {formatCompletionDate(dateKey)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grouped[dateKey].map((c) => (
                  <Badge
                    key={c.id}
                    variant="secondary"
                    className={`${areaColors[c.area] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"} text-xs font-normal`}
                  >
                    {c.taskName}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
