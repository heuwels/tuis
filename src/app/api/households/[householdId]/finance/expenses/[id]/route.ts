import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { householdExpenses, vendors } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string; id: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: hid, id } = await params;
    const householdId = parseInt(hid);
    const expenseId = parseInt(id);

    const result = await db
      .select({
        id: householdExpenses.id,
        date: householdExpenses.date,
        category: householdExpenses.category,
        description: householdExpenses.description,
        amount: householdExpenses.amount,
        vendorId: householdExpenses.vendorId,
        receiptUrl: householdExpenses.receiptUrl,
        notes: householdExpenses.notes,
        householdId: householdExpenses.householdId,
        createdAt: householdExpenses.createdAt,
        updatedAt: householdExpenses.updatedAt,
        vendorName: vendors.name,
      })
      .from(householdExpenses)
      .leftJoin(vendors, eq(householdExpenses.vendorId, vendors.id))
      .where(
        and(
          eq(householdExpenses.id, expenseId),
          eq(householdExpenses.householdId, householdId)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json({ error: "Failed to fetch expense" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string; id: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: hid, id } = await params;
    const householdId = parseInt(hid);
    const expenseId = parseInt(id);
    const body = await request.json();

    const existing = await db
      .select()
      .from(householdExpenses)
      .where(
        and(
          eq(householdExpenses.id, expenseId),
          eq(householdExpenses.householdId, householdId)
        )
      )
      .limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Don't let body override scope
    const patch = { ...body };
    delete patch.householdId;
    delete patch.id;

    await db
      .update(householdExpenses)
      .set({
        ...patch,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(householdExpenses.id, expenseId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string; id: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { householdId: hid, id } = await params;
    const householdId = parseInt(hid);
    const expenseId = parseInt(id);

    const result = await db
      .delete(householdExpenses)
      .where(
        and(
          eq(householdExpenses.id, expenseId),
          eq(householdExpenses.householdId, householdId)
        )
      );

    if (result.changes === 0) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
