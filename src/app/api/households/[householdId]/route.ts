import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { households, userHouseholds, tasks, appliances, vendors, quotes, completions, taskCalendarEvents } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: id } = await params;
    const result = await db
      .select()
      .from(households)
      .where(eq(households.id, parseInt(id)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Household not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error fetching household:", error);
    return NextResponse.json(
      { error: "Failed to fetch household" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    await db
      .update(households)
      .set({ name })
      .where(eq(households.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating household:", error);
    return NextResponse.json(
      { error: "Failed to update household" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: id } = await params;
    const houseId = parseInt(id);

    // Cascade: remove all related data
    // First get task IDs so we can clean up completions and calendar events
    const householdTasks = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.householdId, houseId));
    const taskIds = householdTasks.map((t) => t.id);

    if (taskIds.length > 0) {
      await db.delete(completions).where(inArray(completions.taskId, taskIds));
      await db.delete(taskCalendarEvents).where(inArray(taskCalendarEvents.taskId, taskIds));
    }

    await db.delete(quotes).where(eq(quotes.householdId, houseId));
    await db.delete(vendors).where(eq(vendors.householdId, houseId));
    await db.delete(appliances).where(eq(appliances.householdId, houseId));
    await db.delete(tasks).where(eq(tasks.householdId, houseId));
    await db.delete(userHouseholds).where(eq(userHouseholds.householdId, houseId));
    await db.delete(households).where(eq(households.id, houseId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting household:", error);
    return NextResponse.json(
      { error: "Failed to delete household" },
      { status: 500 }
    );
  }
}
