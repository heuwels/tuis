import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mortgagePayments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { paymentId } = await params;
    const paymentIdNum = parseInt(paymentId);
    const body = await request.json();

    const existing = await db
      .select()
      .from(mortgagePayments)
      .where(eq(mortgagePayments.id, paymentIdNum))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    await db
      .update(mortgagePayments)
      .set(body)
      .where(eq(mortgagePayments.id, paymentIdNum));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating mortgage payment:", error);
    return NextResponse.json(
      { error: "Failed to update mortgage payment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { paymentId } = await params;
    const paymentIdNum = parseInt(paymentId);

    await db
      .delete(mortgagePayments)
      .where(eq(mortgagePayments.id, paymentIdNum));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting mortgage payment:", error);
    return NextResponse.json(
      { error: "Failed to delete mortgage payment" },
      { status: 500 }
    );
  }
}
