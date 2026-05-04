import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quotes, vendors } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";
import { getHouseholdId } from "@/lib/household-header";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const householdId = getHouseholdId(request);

    let query = db
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
      .orderBy(desc(quotes.updatedAt))
      .$dynamic();

    const conditions = [];
    if (householdId) {
      conditions.push(eq(quotes.householdId, householdId));
    }
    if (status) {
      conditions.push(eq(quotes.status, status));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query;
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { description, vendorId, total, labour, materials, other, status, receivedDate, notes } = body;

    if (!description || total === undefined) {
      return NextResponse.json(
        { error: "Description and total are required" },
        { status: 400 }
      );
    }

    const householdId = getHouseholdId(request);
    const result = await db.insert(quotes).values({
      description,
      vendorId: vendorId || null,
      total,
      labour: labour || null,
      materials: materials || null,
      other: other || null,
      status: status || "pending",
      receivedDate: receivedDate || null,
      householdId,
      notes: notes || null,
    });

    return NextResponse.json(
      { success: true, id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating quote:", error);
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}
