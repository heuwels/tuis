import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { propertyIncome } from "@/lib/db/schema";
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
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [eq(propertyIncome.propertyId, propertyId)];
    if (category) conditions.push(eq(propertyIncome.category, category));
    if (from) conditions.push(gte(propertyIncome.date, from));
    if (to) conditions.push(lte(propertyIncome.date, to));

    const results = await db
      .select()
      .from(propertyIncome)
      .where(and(...conditions))
      .orderBy(desc(propertyIncome.date));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching property income:", error);
    return NextResponse.json(
      { error: "Failed to fetch property income" },
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
    const { date, amount, category, description, tenant, notes } = body;

    if (!date || amount === undefined || !category) {
      return NextResponse.json(
        { error: "date, amount, and category are required" },
        { status: 400 }
      );
    }

    const result = await db.insert(propertyIncome).values({
      propertyId,
      date,
      amount,
      category,
      description: description || null,
      tenant: tenant || null,
      notes: notes || null,
    });

    return NextResponse.json(
      { success: true, id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating property income:", error);
    return NextResponse.json(
      { error: "Failed to create property income" },
      { status: 500 }
    );
  }
}
