import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, completions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { syncTask, deleteTaskCalendarEvents } from "@/lib/calendar";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await db.select().from(tasks).where(eq(tasks.id, parseInt(id))).limit(1);

    if (task.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task[0]);
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = await db
      .update(tasks)
      .set({
        ...body,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, parseInt(id)));

    if (result.changes === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Sync to Google Calendar (if connected and task is syncable)
    const updatedTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(id)))
      .limit(1);
    if (updatedTask[0]) {
      syncTask(updatedTask[0]).catch(console.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);

    // Delete calendar events first
    await deleteTaskCalendarEvents(taskId).catch(console.error);

    // Delete related completions to avoid foreign key constraint
    await db.delete(completions).where(eq(completions.taskId, taskId));

    // Then delete the task
    const result = await db.delete(tasks).where(eq(tasks.id, taskId));

    if (result.changes === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
