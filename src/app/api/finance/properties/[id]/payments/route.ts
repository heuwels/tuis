import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mortgagePayments } from "@/lib/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { id } = await params;
    const propertyId = parseInt(id);

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = db
      .select()
      .from(mortgagePayments)
      .where(eq(mortgagePayments.propertyId, propertyId))
      .orderBy(desc(mortgagePayments.date))
      .$dynamic();

    const conditions = [eq(mortgagePayments.propertyId, propertyId)];
    if (from) conditions.push(gte(mortgagePayments.date, from));
    if (to) conditions.push(lte(mortgagePayments.date, to));

    if (conditions.length > 1) {
      query = db
        .select()
        .from(mortgagePayments)
        .where(and(...conditions))
        .orderBy(desc(mortgagePayments.date))
        .$dynamic();
    }

    const results = await query;
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching mortgage payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch mortgage payments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { id } = await params;
    const propertyId = parseInt(id);
    const body = await request.json();
    const { date, paymentAmount, interestAmount, principalAmount, notes } = body;

    if (!date || paymentAmount === undefined || interestAmount === undefined || principalAmount === undefined) {
      return NextResponse.json(
        { error: "date, paymentAmount, interestAmount, and principalAmount are required" },
        { status: 400 }
      );
    }

    const result = await db.insert(mortgagePayments).values({
      propertyId,
      date,
      paymentAmount,
      interestAmount,
      principalAmount,
      notes: notes || null,
    });

    return NextResponse.json(
      { success: true, id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating mortgage payment:", error);
    return NextResponse.json(
      { error: "Failed to create mortgage payment" },
      { status: 500 }
    );
  }
}
