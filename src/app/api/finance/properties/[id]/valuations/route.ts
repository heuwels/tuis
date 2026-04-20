import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { propertyValuations } from "@/lib/db/schema";
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
      .from(propertyValuations)
      .where(eq(propertyValuations.propertyId, propertyId))
      .orderBy(desc(propertyValuations.date));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching property valuations:", error);
    return NextResponse.json(
      { error: "Failed to fetch property valuations" },
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
    const { date, estimatedValue, source, notes } = body;

    if (!date || estimatedValue === undefined) {
      return NextResponse.json(
        { error: "date and estimatedValue are required" },
        { status: 400 }
      );
    }

    const result = await db.insert(propertyValuations).values({
      propertyId,
      date,
      estimatedValue,
      source: source || null,
      notes: notes || null,
    });

    return NextResponse.json(
      { success: true, id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating property valuation:", error);
    return NextResponse.json(
      { error: "Failed to create property valuation" },
      { status: 500 }
    );
  }
}
