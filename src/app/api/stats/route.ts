import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, completions } from "@/lib/db/schema";
import { sql, eq, gte, and, count } from "drizzle-orm";
import { subDays, startOfDay, startOfWeek, startOfMonth, format } from "date-fns";

export async function GET() {
  try {
    const now = new Date();
    const todayStart = format(startOfDay(now), "yyyy-MM-dd");
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
    const last30Days = format(subDays(now, 30), "yyyy-MM-dd");

    // Total tasks
    const totalTasks = await db.select({ count: count() }).from(tasks);

    // Overdue tasks
    const overdueTasks = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          sql`${tasks.nextDue} IS NOT NULL`,
          sql`${tasks.nextDue} < ${todayStart}`,
          sql`${tasks.frequency} != 'Daily'`
        )
      );

    // Completions this week
    const completionsThisWeek = await db
      .select({ count: count() })
      .from(completions)
      .where(gte(completions.completedAt, weekStart));

    // Completions this month
    const completionsThisMonth = await db
      .select({ count: count() })
      .from(completions)
      .where(gte(completions.completedAt, monthStart));

    // Completions by day (last 30 days)
    const completionsByDay = await db
      .select({
        date: completions.completedAt,
        count: count(),
      })
      .from(completions)
      .where(gte(completions.completedAt, last30Days))
      .groupBy(completions.completedAt)
      .orderBy(completions.completedAt);

    // Completions by area
    const completionsByArea = await db
      .select({
        area: tasks.area,
        count: count(),
      })
      .from(completions)
      .innerJoin(tasks, eq(completions.taskId, tasks.id))
      .where(gte(completions.completedAt, monthStart))
      .groupBy(tasks.area);

    // Most completed tasks
    const mostCompletedTasks = await db
      .select({
        taskId: completions.taskId,
        taskName: tasks.name,
        area: tasks.area,
        count: count(),
      })
      .from(completions)
      .innerJoin(tasks, eq(completions.taskId, tasks.id))
      .where(gte(completions.completedAt, monthStart))
      .groupBy(completions.taskId, tasks.name, tasks.area)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    // Tasks due soon (next 7 days)
    const next7Days = format(subDays(now, -7), "yyyy-MM-dd");
    const tasksDueSoon = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          sql`${tasks.nextDue} IS NOT NULL`,
          sql`${tasks.nextDue} >= ${todayStart}`,
          sql`${tasks.nextDue} <= ${next7Days}`,
          sql`${tasks.frequency} != 'Daily'`
        )
      );

    return NextResponse.json({
      totalTasks: totalTasks[0].count,
      overdueTasks: overdueTasks[0].count,
      tasksDueSoon: tasksDueSoon[0].count,
      completionsThisWeek: completionsThisWeek[0].count,
      completionsThisMonth: completionsThisMonth[0].count,
      completionsByDay,
      completionsByArea,
      mostCompletedTasks,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
