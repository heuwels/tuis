import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fuelLogs, vehicles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vehicleId = parseInt(id);

    const logs = await db
      .select()
      .from(fuelLogs)
      .where(eq(fuelLogs.vehicleId, vehicleId))
      .orderBy(desc(fuelLogs.date));

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching fuel logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch fuel logs" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vehicleId = parseInt(id);
    const body = await request.json();

    if (!body.date || !body.odometer || !body.litres || !body.costTotal) {
      return NextResponse.json(
        { error: "Date, odometer, litres and total cost are required" },
        { status: 400 }
      );
    }

    const costPerLitre = body.costPerLitre || (body.costTotal / body.litres);

    const result = await db.insert(fuelLogs).values({
      vehicleId,
      date: body.date,
      odometer: body.odometer,
      litres: body.litres,
      costTotal: body.costTotal,
      costPerLitre,
      station: body.station || null,
      isFullTank: body.isFullTank !== undefined ? (body.isFullTank ? 1 : 0) : 1,
      notes: body.notes || null,
      createdAt: null,
    });

    // Update vehicle odometer if fuel log odometer is higher
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId));

    if (vehicle && (!vehicle.currentOdometer || body.odometer > vehicle.currentOdometer)) {
      await db
        .update(vehicles)
        .set({
          currentOdometer: body.odometer,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(vehicles.id, vehicleId));
    }

    return NextResponse.json(
      { success: true, id: Number(result.lastInsertRowid) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating fuel log:", error);
    return NextResponse.json(
      { error: "Failed to create fuel log" },
      { status: 500 }
    );
  }
}
