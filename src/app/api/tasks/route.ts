import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { syncTask } from "@/lib/calendar";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const allTasks = await db.select().from(tasks).orderBy(desc(tasks.nextDue));
    return NextResponse.json(allTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { name, area, frequency, assignedDay, season, notes, nextDue, applianceId } = body;

    if (!name || !area || !frequency) {
      return NextResponse.json(
        { error: "Name, area, and frequency are required" },
        { status: 400 }
      );
    }

    const result = await db.insert(tasks).values({
      name,
      area,
      frequency,
      assignedDay: assignedDay || null,
      season: season || null,
      notes: notes || null,
      nextDue: nextDue || null,
      lastCompleted: null,
      applianceId: applianceId || null,
    });

    // Sync to Google Calendar (if connected and task is syncable)
    const newTaskId = Number(result.lastInsertRowid);
    const newTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, newTaskId))
      .limit(1);
    if (newTask[0]) {
      syncTask(newTask[0]).catch(console.error);
    }

    return NextResponse.json({ success: true, id: newTaskId }, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
