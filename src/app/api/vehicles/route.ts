import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { like, or, desc, and } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(vehicles.name, `%${search}%`),
          like(vehicles.make, `%${search}%`),
          like(vehicles.model, `%${search}%`),
          like(vehicles.regoNumber, `%${search}%`)
        )
      );
    }

    let result;
    if (conditions.length > 0) {
      result = await db
        .select()
        .from(vehicles)
        .where(and(...conditions))
        .orderBy(desc(vehicles.updatedAt));
    } else {
      result = await db
        .select()
        .from(vehicles)
        .orderBy(desc(vehicles.updatedAt));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const result = await db.insert(vehicles).values({
      name,
      make: body.make || null,
      model: body.model || null,
      year: body.year || null,
      colour: body.colour || null,
      regoNumber: body.regoNumber || null,
      regoState: body.regoState || null,
      vin: body.vin || null,
      purchaseDate: body.purchaseDate || null,
      purchasePrice: body.purchasePrice || null,
      currentOdometer: body.currentOdometer || null,
      imageUrl: body.imageUrl || null,
      regoExpiry: body.regoExpiry || null,
      insuranceProvider: body.insuranceProvider || null,
      insuranceExpiry: body.insuranceExpiry || null,
      warrantyExpiryDate: body.warrantyExpiryDate || null,
      warrantyExpiryKm: body.warrantyExpiryKm || null,
      notes: body.notes || null,
      createdAt: null,
      updatedAt: null,
    });

    return NextResponse.json(
      { success: true, id: Number(result.lastInsertRowid) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating vehicle:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
