import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mortgageRates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
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

    const results = await db
      .select()
      .from(mortgageRates)
      .where(eq(mortgageRates.propertyId, propertyId))
      .orderBy(desc(mortgageRates.effectiveDate));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching mortgage rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch mortgage rates" },
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
    const { effectiveDate, annualRate, notes } = body;

    if (!effectiveDate || annualRate === undefined) {
      return NextResponse.json(
        { error: "effectiveDate and annualRate are required" },
        { status: 400 }
      );
    }

    const result = await db.insert(mortgageRates).values({
      propertyId,
      effectiveDate,
      annualRate,
      notes: notes || null,
    });

    return NextResponse.json(
      { success: true, id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating mortgage rate:", error);
    return NextResponse.json(
      { error: "Failed to create mortgage rate" },
      { status: 500 }
    );
  }
}
