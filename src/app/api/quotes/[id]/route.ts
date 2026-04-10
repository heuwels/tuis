import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quotes, vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quoteId = parseInt(id);

    const result = await db
      .select({
        id: quotes.id,
        vendorId: quotes.vendorId,
        description: quotes.description,
        total: quotes.total,
        labour: quotes.labour,
        materials: quotes.materials,
        other: quotes.other,
        status: quotes.status,
        receivedDate: quotes.receivedDate,
        notes: quotes.notes,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
        vendorName: vendors.name,
        vendorCategory: vendors.category,
      })
      .from(quotes)
      .leftJoin(vendors, eq(quotes.vendorId, vendors.id))
      .where(eq(quotes.id, quoteId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quoteId = parseInt(id);
    const body = await request.json();

    const existing = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    await db
      .update(quotes)
      .set({
        ...body,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(quotes.id, quoteId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating quote:", error);
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quoteId = parseInt(id);

    await db.delete(quotes).where(eq(quotes.id, quoteId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting quote:", error);
    return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 });
  }
}
