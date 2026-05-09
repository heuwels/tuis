import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mortgagePayments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";
import { propertyBelongsToHousehold } from "@/lib/finance/scope";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ householdId: string; id: string; paymentId: string }>;
};

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: hid, id, paymentId } = await params;
    const householdId = parseInt(hid);
    const propertyId = parseInt(id);
    const paymentIdNum = parseInt(paymentId);

    if (!(await propertyBelongsToHousehold(propertyId, householdId))) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const body = await request.json();

    const existing = await db
      .select()
      .from(mortgagePayments)
      .where(
        and(
          eq(mortgagePayments.id, paymentIdNum),
          eq(mortgagePayments.propertyId, propertyId)
        )
      )
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

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: hid, id, paymentId } = await params;
    const householdId = parseInt(hid);
    const propertyId = parseInt(id);
    const paymentIdNum = parseInt(paymentId);

    if (!(await propertyBelongsToHousehold(propertyId, householdId))) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const result = await db
      .delete(mortgagePayments)
      .where(
        and(
          eq(mortgagePayments.id, paymentIdNum),
          eq(mortgagePayments.propertyId, propertyId)
        )
      );

    if (result.changes === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting mortgage payment:", error);
    return NextResponse.json(
      { error: "Failed to delete mortgage payment" },
      { status: 500 }
    );
  }
}
