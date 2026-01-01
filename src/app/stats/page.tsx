"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Calendar,
  ListTodo,
} from "lucide-react";

interface Stats {
  totalTasks: number;
  overdueTasks: number;
  tasksDueSoon: number;
  completionsThisWeek: number;
  completionsThisMonth: number;
  completionsByDay: { date: string; count: number }[];
  completionsByArea: { area: string; count: number }[];
  mostCompletedTasks: {
    taskId: number;
    taskName: string;
    area: string;
    count: number;
  }[];
}

const areaColors: Record<string, string> = {
  Kitchen: "bg-orange-500",
  Bathroom: "bg-blue-500",
  "Whole house": "bg-purple-500",
  Garden: "bg-green-500",
  Exterior: "bg-stone-500",
  Bedrooms: "bg-pink-500",
  Lounge: "bg-yellow-500",
  "Living room": "bg-yellow-500",
  Interior: "bg-indigo-500",
  Laundry: "bg-cyan-500",
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading statistics...</div>
          </div>
        </main>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            Failed to load statistics
          </div>
        </main>
      </div>
    );
  }

  const maxCompletions = Math.max(
    ...stats.completionsByDay.map((d) => d.count),
    1
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ListTodo className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold">{stats.totalTasks}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold">{stats.overdueTasks}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due This Week</p>
                  <p className="text-2xl font-bold">{stats.tasksDueSoon}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Done This Week</p>
                  <p className="text-2xl font-bold">{stats.completionsThisWeek}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Completions Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Completions (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.completionsByDay.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No completions recorded yet
                </p>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {stats.completionsByDay.map((day) => (
                    <div
                      key={day.date}
                      className="flex-1 bg-blue-500 rounded-t min-w-[4px]"
                      style={{
                        height: `${(day.count / maxCompletions) * 100}%`,
                      }}
                      title={`${day.date}: ${day.count} completions`}
                    />
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4 text-center">
                {stats.completionsThisMonth} completions this month
              </p>
            </CardContent>
          </Card>

          {/* By Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Completions by Area (This Month)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.completionsByArea.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No completions recorded yet
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.completionsByArea
                    .sort((a, b) => b.count - a.count)
                    .map((item) => {
                      const maxCount = Math.max(
                        ...stats.completionsByArea.map((a) => a.count)
                      );
                      const percentage = (item.count / maxCount) * 100;
                      return (
                        <div key={item.area} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{item.area}</span>
                            <span className="text-muted-foreground">
                              {item.count}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                areaColors[item.area] || "bg-gray-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Most Completed Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Most Completed Tasks (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.mostCompletedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No completions recorded yet
              </p>
            ) : (
              <div className="space-y-2">
                {stats.mostCompletedTasks.map((task, index) => (
                  <div
                    key={task.taskId}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <span className="font-medium">{task.taskName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {task.area}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium">
                      {task.count} times
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
