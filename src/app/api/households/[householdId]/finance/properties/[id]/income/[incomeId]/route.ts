import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { propertyIncome } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";
import { propertyBelongsToHousehold } from "@/lib/finance/scope";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ householdId: string; id: string; incomeId: string }>;
};

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: hid, id, incomeId } = await params;
    const householdId = parseInt(hid);
    const propertyId = parseInt(id);
    const incomeIdNum = parseInt(incomeId);

    if (!(await propertyBelongsToHousehold(propertyId, householdId))) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const body = await request.json();

    const existing = await db
      .select()
      .from(propertyIncome)
      .where(
        and(
          eq(propertyIncome.id, incomeIdNum),
          eq(propertyIncome.propertyId, propertyId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Income not found" }, { status: 404 });
    }

    await db
      .update(propertyIncome)
      .set(body)
      .where(eq(propertyIncome.id, incomeIdNum));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating property income:", error);
    return NextResponse.json(
      { error: "Failed to update property income" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: hid, id, incomeId } = await params;
    const householdId = parseInt(hid);
    const propertyId = parseInt(id);
    const incomeIdNum = parseInt(incomeId);

    if (!(await propertyBelongsToHousehold(propertyId, householdId))) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const result = await db
      .delete(propertyIncome)
      .where(
        and(
          eq(propertyIncome.id, incomeIdNum),
          eq(propertyIncome.propertyId, propertyId)
        )
      );

    if (result.changes === 0) {
      return NextResponse.json({ error: "Income not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting property income:", error);
    return NextResponse.json(
      { error: "Failed to delete property income" },
      { status: 500 }
    );
  }
}
