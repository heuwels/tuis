import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, completions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  addDays,
  addWeeks,
  addMonths,
  format,
  parseISO,
} from "date-fns";
import { syncTask } from "@/lib/calendar";

function calculateNextDue(frequency: string, completedDate: Date): string | null {
  const freq = frequency.toLowerCase();

  if (freq === "daily") {
    return format(addDays(completedDate, 1), "yyyy-MM-dd");
  }
  if (freq === "weekly" || freq.includes("weekly")) {
    return format(addWeeks(completedDate, 1), "yyyy-MM-dd");
  }
  if (freq === "bi-weekly") {
    return format(addWeeks(completedDate, 2), "yyyy-MM-dd");
  }
  if (freq === "monthly") {
    return format(addMonths(completedDate, 1), "yyyy-MM-dd");
  }
  if (freq === "quarterly") {
    return format(addMonths(completedDate, 3), "yyyy-MM-dd");
  }
  if (freq === "bi-annually") {
    return format(addMonths(completedDate, 6), "yyyy-MM-dd");
  }
  if (freq === "annual") {
    return format(addMonths(completedDate, 12), "yyyy-MM-dd");
  }

  // For ad-hoc or unknown frequencies, don't set a next due date
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const completedDateStr = body.completedDate || format(new Date(), "yyyy-MM-dd");
    const completedDate = parseISO(completedDateStr);
    const vendorId = body.vendorId || null;
    const cost = body.cost || null;
    const completedBy = body.completedBy || null;

    // Get the task to find its frequency
    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(id)))
      .limit(1);

    if (task.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const nextDue = calculateNextDue(task[0].frequency, completedDate);

    // Record the completion
    await db.insert(completions).values({
      taskId: parseInt(id),
      completedAt: completedDateStr,
      completedBy: completedBy,
      vendorId: vendorId,
      cost: cost,
    });

    // Update the task
    await db
      .update(tasks)
      .set({
        lastCompleted: completedDateStr,
        nextDue: nextDue,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, parseInt(id)));

    // Sync to Google Calendar (if connected and task is syncable)
    const updatedTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(id)))
      .limit(1);
    if (updatedTask[0]) {
      syncTask(updatedTask[0]).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      lastCompleted: completedDateStr,
      nextDue: nextDue,
    });
  } catch (error) {
    console.error("Error completing task:", error);
    return NextResponse.json({ error: "Failed to complete task" }, { status: 500 });
  }
}
