import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quotes, vendors } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

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

    if (status) {
      query = query.where(eq(quotes.status, status));
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

    const result = await db.insert(quotes).values({
      description,
      vendorId: vendorId || null,
      total,
      labour: labour || null,
      materials: materials || null,
      other: other || null,
      status: status || "pending",
      receivedDate: receivedDate || null,
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
