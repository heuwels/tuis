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
    <Card className="bg-green-50/50 border-green-100">
      <CardHeader
        className="pb-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Recently Completed
            <span className="text-xs font-normal text-green-600/70">
              ({completions.length} this week)
            </span>
          </CardTitle>
          {dates.length > 2 && (
            isExpanded
              ? <ChevronUp className="h-4 w-4 text-green-400" />
              : <ChevronDown className="h-4 w-4 text-green-400" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleDates.map((dateKey) => (
            <div key={dateKey}>
              <p className="text-xs font-medium text-green-600/70 mb-1.5">
                {formatCompletionDate(dateKey)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grouped[dateKey].map((c) => (
                  <Badge
                    key={c.id}
                    variant="secondary"
                    className={`${areaColors[c.area] || "bg-gray-100 text-gray-700"} text-xs font-normal`}
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
