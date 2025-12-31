import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allTasks = await db.select().from(tasks).orderBy(desc(tasks.nextDue));
    return NextResponse.json(allTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, area, frequency, assignedDay, season, notes, nextDue } = body;

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
    });

    return NextResponse.json({ success: true, id: result.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
