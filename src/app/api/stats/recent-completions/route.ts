import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { completions, tasks, users } from "@/lib/db/schema";
import { eq, gte, desc } from "drizzle-orm";
import { format, startOfWeek } from "date-fns";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const weekStart = format(
      startOfWeek(new Date(), { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    );

    const recent = await db
      .select({
        id: completions.id,
        taskId: completions.taskId,
        taskName: tasks.name,
        area: tasks.area,
        completedAt: completions.completedAt,
        completedBy: completions.completedBy,
        completedByName: users.name,
      })
      .from(completions)
      .innerJoin(tasks, eq(completions.taskId, tasks.id))
      .leftJoin(users, eq(completions.completedBy, users.id))
      .where(gte(completions.completedAt, weekStart))
      .orderBy(desc(completions.completedAt))
      .limit(30);

    return NextResponse.json(recent);
  } catch (error) {
    console.error("Error fetching recent completions:", error);
    return NextResponse.json([], { status: 500 });
  }
}
