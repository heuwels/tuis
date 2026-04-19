import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appliances } from "@/lib/db/schema";
import { eq, like, or, desc } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const location = searchParams.get("location");

    const query = db.select().from(appliances);

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(appliances.name, `%${search}%`),
          like(appliances.brand, `%${search}%`),
          like(appliances.model, `%${search}%`)
        )
      );
    }

    if (location) {
      conditions.push(eq(appliances.location, location));
    }

    let result;
    if (conditions.length > 0) {
      const { and } = await import("drizzle-orm");
      result = await query.where(and(...conditions)).orderBy(desc(appliances.updatedAt));
    } else {
      result = await query.orderBy(desc(appliances.updatedAt));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching appliances:", error);
    return NextResponse.json(
      { error: "Failed to fetch appliances" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const {
      name,
      location,
      brand,
      model,
      purchaseDate,
      warrantyExpiry,
      manualUrl,
      warrantyDocUrl,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const result = await db.insert(appliances).values({
      name,
      location: location || null,
      brand: brand || null,
      model: model || null,
      purchaseDate: purchaseDate || null,
      warrantyExpiry: warrantyExpiry || null,
      manualUrl: manualUrl || null,
      warrantyDocUrl: warrantyDocUrl || null,
      notes: notes || null,
      createdAt: null,
      updatedAt: null,
    });

    return NextResponse.json(
      { success: true, id: Number(result.lastInsertRowid) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating appliance:", error);
    return NextResponse.json(
      { error: "Failed to create appliance" },
      { status: 500 }
    );
  }
}
