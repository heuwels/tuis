import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq, like, or, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(vendors.name, `%${search}%`),
          like(vendors.notes, `%${search}%`)
        )
      );
    }

    if (category) {
      conditions.push(eq(vendors.category, category));
    }

    let result;
    if (conditions.length > 0) {
      result = await db
        .select()
        .from(vendors)
        .where(and(...conditions))
        .orderBy(desc(vendors.updatedAt));
    } else {
      result = await db
        .select()
        .from(vendors)
        .orderBy(desc(vendors.updatedAt));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendors" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, phone, email, website, notes, rating } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const result = await db.insert(vendors).values({
      name,
      category: category || null,
      phone: phone || null,
      email: email || null,
      website: website || null,
      notes: notes || null,
      rating: rating || null,
      createdAt: null,
      updatedAt: null,
    });

    return NextResponse.json(
      { success: true, id: Number(result.lastInsertRowid) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating vendor:", error);
    return NextResponse.json(
      { error: "Failed to create vendor" },
      { status: 500 }
    );
  }
}
