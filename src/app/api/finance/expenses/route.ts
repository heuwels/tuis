import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { householdExpenses, vendors } from "@/lib/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = db
      .select({
        id: householdExpenses.id,
        date: householdExpenses.date,
        category: householdExpenses.category,
        description: householdExpenses.description,
        amount: householdExpenses.amount,
        vendorId: householdExpenses.vendorId,
        receiptUrl: householdExpenses.receiptUrl,
        notes: householdExpenses.notes,
        createdAt: householdExpenses.createdAt,
        updatedAt: householdExpenses.updatedAt,
        vendorName: vendors.name,
      })
      .from(householdExpenses)
      .leftJoin(vendors, eq(householdExpenses.vendorId, vendors.id))
      .orderBy(desc(householdExpenses.date))
      .$dynamic();

    const conditions = [];
    if (category) conditions.push(eq(householdExpenses.category, category));
    if (from) conditions.push(gte(householdExpenses.date, from));
    if (to) conditions.push(lte(householdExpenses.date, to));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query;
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { date, category, description, amount, vendorId, receiptUrl, notes } = body;

    if (!date || !category || !description || amount === undefined) {
      return NextResponse.json(
        { error: "Date, category, description, and amount are required" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    const result = await db.insert(householdExpenses).values({
      date,
      category,
      description,
      amount,
      vendorId: vendorId || null,
      receiptUrl: receiptUrl || null,
      notes: notes || null,
    });

    return NextResponse.json(
      { success: true, id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
