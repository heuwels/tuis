import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appliances, tasks, completions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { id } = await params;
    const applianceId = parseInt(id);

    const [appliance] = await db
      .select()
      .from(appliances)
      .where(eq(appliances.id, applianceId));

    if (!appliance) {
      return NextResponse.json(
        { error: "Appliance not found" },
        { status: 404 }
      );
    }

    // Get linked tasks
    const linkedTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.applianceId, applianceId));

    // Get service history (completions for linked tasks)
    const taskIds = linkedTasks.map((t) => t.id);
    let serviceHistory: Array<{
      id: number;
      taskId: number;
      taskName: string;
      completedAt: string;
      vendorId: number | null;
      cost: string | null;
    }> = [];

    if (taskIds.length > 0) {
      const { inArray } = await import("drizzle-orm");
      const completionResults = await db
        .select({
          id: completions.id,
          taskId: completions.taskId,
          taskName: tasks.name,
          completedAt: completions.completedAt,
          vendorId: completions.vendorId,
          cost: completions.cost,
        })
        .from(completions)
        .innerJoin(tasks, eq(completions.taskId, tasks.id))
        .where(inArray(completions.taskId, taskIds))
        .orderBy(desc(completions.completedAt));

      serviceHistory = completionResults;
    }

    return NextResponse.json({
      ...appliance,
      tasks: linkedTasks,
      serviceHistory,
    });
  } catch (error) {
    console.error("Error fetching appliance:", error);
    return NextResponse.json(
      { error: "Failed to fetch appliance" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { id } = await params;
    const applianceId = parseInt(id);
    const body = await request.json();

    const {
      name,
      location,
      brand,
      model,
      purchaseDate,
      warrantyExpiry,
      manualUrl,
      warrantyDocUrl,
      notes,
    } = body;

    const result = await db
      .update(appliances)
      .set({
        name: name || undefined,
        location: location || null,
        brand: brand || null,
        model: model || null,
        purchaseDate: purchaseDate || null,
        warrantyExpiry: warrantyExpiry || null,
        manualUrl: manualUrl || null,
        warrantyDocUrl: warrantyDocUrl || null,
        notes: notes || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(appliances.id, applianceId));

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Appliance not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating appliance:", error);
    return NextResponse.json(
      { error: "Failed to update appliance" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { id } = await params;
    const applianceId = parseInt(id);

    // First, unlink any tasks that reference this appliance
    await db
      .update(tasks)
      .set({ applianceId: null })
      .where(eq(tasks.applianceId, applianceId));

    // Then delete the appliance
    const result = await db
      .delete(appliances)
      .where(eq(appliances.id, applianceId));

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Appliance not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting appliance:", error);
    return NextResponse.json(
      { error: "Failed to delete appliance" },
      { status: 500 }
    );
  }
}
