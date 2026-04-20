import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { propertyValuations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; valuationId: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { valuationId } = await params;
    const valuationIdNum = parseInt(valuationId);
    const body = await request.json();

    const existing = await db
      .select()
      .from(propertyValuations)
      .where(eq(propertyValuations.id, valuationIdNum))
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; valuationId: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { valuationId } = await params;
    const valuationIdNum = parseInt(valuationId);

    await db
      .delete(propertyValuations)
      .where(eq(propertyValuations.id, valuationIdNum));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting property valuation:", error);
    return NextResponse.json(
      { error: "Failed to delete property valuation" },
      { status: 500 }
    );
  }
}
