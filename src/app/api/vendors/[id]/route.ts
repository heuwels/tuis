import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors, completions, tasks, vehicleServices } from "@/lib/db/schema";
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
    const vendorId = parseInt(id);

    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, vendorId));

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Get job history (completions where this vendor was used)
    const jobHistory = await db
      .select({
        id: completions.id,
        taskId: completions.taskId,
        taskName: tasks.name,
        completedAt: completions.completedAt,
        cost: completions.cost,
      })
      .from(completions)
      .innerJoin(tasks, eq(completions.taskId, tasks.id))
      .where(eq(completions.vendorId, vendorId))
      .orderBy(desc(completions.completedAt));

    return NextResponse.json({
      ...vendor,
      jobHistory,
    });
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor" },
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
    const vendorId = parseInt(id);
    const body = await request.json();

    const { name, category, phone, email, website, notes, rating } = body;

    const result = await db
      .update(vendors)
      .set({
        name: name || undefined,
        category: category || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        notes: notes || null,
        rating: rating || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(vendors.id, vendorId));

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating vendor:", error);
    return NextResponse.json(
      { error: "Failed to update vendor" },
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
    const vendorId = parseInt(id);

    // Unlink any completions that reference this vendor
    await db
      .update(completions)
      .set({ vendorId: null })
      .where(eq(completions.vendorId, vendorId));

    // Unlink any vehicle services that reference this vendor
    await db
      .update(vehicleServices)
      .set({ vendorId: null })
      .where(eq(vehicleServices.vendorId, vendorId));

    // Then delete the vendor
    const result = await db
      .delete(vendors)
      .where(eq(vendors.id, vendorId));

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return NextResponse.json(
      { error: "Failed to delete vendor" },
      { status: 500 }
    );
  }
}
