import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const results = await db
      .select()
      .from(properties)
      .orderBy(desc(properties.createdAt));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { address, purchasePrice, purchaseDate, loanAmountOriginal, loanTermYears, lender, notes } = body;

    if (!address || purchasePrice === undefined || !purchaseDate || loanAmountOriginal === undefined) {
      return NextResponse.json(
        { error: "Address, purchasePrice, purchaseDate, and loanAmountOriginal are required" },
        { status: 400 }
      );
    }

    const result = await db.insert(properties).values({
      address,
      purchasePrice,
      purchaseDate,
      loanAmountOriginal,
      loanTermYears: loanTermYears || null,
      lender: lender || null,
      notes: notes || null,
    });

    return NextResponse.json(
      { success: true, id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating property:", error);
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 }
    );
  }
}
