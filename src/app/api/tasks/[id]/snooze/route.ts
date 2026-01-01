import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { addDays, addWeeks, format, parseISO } from "date-fns";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { duration } = body; // "1day", "3days", "1week", "2weeks"

    // Get the task
    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(id)))
      .limit(1);

    if (task.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Calculate new due date from current due date or today
    const baseDate = task[0].nextDue
      ? parseISO(task[0].nextDue)
      : new Date();

    let newDueDate: Date;
    switch (duration) {
      case "1day":
        newDueDate = addDays(baseDate, 1);
        break;
      case "3days":
        newDueDate = addDays(baseDate, 3);
        break;
      case "1week":
        newDueDate = addWeeks(baseDate, 1);
        break;
      case "2weeks":
        newDueDate = addWeeks(baseDate, 2);
        break;
      default:
        newDueDate = addDays(baseDate, 1);
    }

    const formattedDate = format(newDueDate, "yyyy-MM-dd");

    // Update the task
    await db
      .update(tasks)
      .set({
        nextDue: formattedDate,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      nextDue: formattedDate,
    });
  } catch (error) {
    console.error("Error snoozing task:", error);
    return NextResponse.json({ error: "Failed to snooze task" }, { status: 500 });
  }
}
