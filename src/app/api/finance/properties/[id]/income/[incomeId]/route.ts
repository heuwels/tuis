import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { propertyIncome } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; incomeId: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { incomeId } = await params;
    const incomeIdNum = parseInt(incomeId);
    const body = await request.json();

    const existing = await db
      .select()
      .from(propertyIncome)
      .where(eq(propertyIncome.id, incomeIdNum))
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; incomeId: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { incomeId } = await params;
    const incomeIdNum = parseInt(incomeId);

    await db
      .delete(propertyIncome)
      .where(eq(propertyIncome.id, incomeIdNum));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting property income:", error);
    return NextResponse.json(
      { error: "Failed to delete property income" },
      { status: 500 }
    );
  }
}
