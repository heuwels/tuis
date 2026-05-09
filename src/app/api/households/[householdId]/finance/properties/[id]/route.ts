import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ householdId: string; id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: hid, id } = await params;
    const householdId = parseInt(hid);
    const propertyId = parseInt(id);

    const result = await db
      .select()
      .from(properties)
      .where(
        and(eq(properties.id, propertyId), eq(properties.householdId, householdId))
      )
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json(
      { error: "Failed to fetch property" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: hid, id } = await params;
    const householdId = parseInt(hid);
    const propertyId = parseInt(id);
    const body = await request.json();

    const existing = await db
      .select()
      .from(properties)
      .where(
        and(eq(properties.id, propertyId), eq(properties.householdId, householdId))
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Don't let body override scope
    const patch = { ...body };
    delete patch.householdId;
    delete patch.id;

    await db
      .update(properties)
      .set({
        ...patch,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(properties.id, propertyId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating property:", error);
    return NextResponse.json(
      { error: "Failed to update property" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: hid, id } = await params;
    const householdId = parseInt(hid);
    const propertyId = parseInt(id);

    const result = await db
      .delete(properties)
      .where(
        and(eq(properties.id, propertyId), eq(properties.householdId, householdId))
      );

    if (result.changes === 0) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json(
      { error: "Failed to delete property" },
      { status: 500 }
    );
  }
}
