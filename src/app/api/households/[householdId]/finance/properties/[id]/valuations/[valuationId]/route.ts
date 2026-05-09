import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { propertyValuations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";
import { propertyBelongsToHousehold } from "@/lib/finance/scope";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ householdId: string; id: string; valuationId: string }>;
};

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: hid, id, valuationId } = await params;
    const householdId = parseInt(hid);
    const propertyId = parseInt(id);
    const valuationIdNum = parseInt(valuationId);

    if (!(await propertyBelongsToHousehold(propertyId, householdId))) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const body = await request.json();

    const existing = await db
      .select()
      .from(propertyValuations)
      .where(
        and(
          eq(propertyValuations.id, valuationIdNum),
          eq(propertyValuations.propertyId, propertyId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Valuation not found" }, { status: 404 });
    }

    await db
      .update(propertyValuations)
      .set(body)
      .where(eq(propertyValuations.id, valuationIdNum));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating property valuation:", error);
    return NextResponse.json(
      { error: "Failed to update property valuation" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: hid, id, valuationId } = await params;
    const householdId = parseInt(hid);
    const propertyId = parseInt(id);
    const valuationIdNum = parseInt(valuationId);

    if (!(await propertyBelongsToHousehold(propertyId, householdId))) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const result = await db
      .delete(propertyValuations)
      .where(
        and(
          eq(propertyValuations.id, valuationIdNum),
          eq(propertyValuations.propertyId, propertyId)
        )
      );

    if (result.changes === 0) {
      return NextResponse.json({ error: "Valuation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting property valuation:", error);
    return NextResponse.json(
      { error: "Failed to delete property valuation" },
      { status: 500 }
    );
  }
}
