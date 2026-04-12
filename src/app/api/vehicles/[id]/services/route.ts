import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicleServices, vendors, vehicles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vehicleId = parseInt(id);

    const services = await db
      .select({
        id: vehicleServices.id,
        vehicleId: vehicleServices.vehicleId,
        date: vehicleServices.date,
        odometer: vehicleServices.odometer,
        vendorId: vehicleServices.vendorId,
        cost: vehicleServices.cost,
        description: vehicleServices.description,
        serviceType: vehicleServices.serviceType,
        receiptUrl: vehicleServices.receiptUrl,
        isDiy: vehicleServices.isDiy,
        notes: vehicleServices.notes,
        createdAt: vehicleServices.createdAt,
        vendorName: vendors.name,
      })
      .from(vehicleServices)
      .leftJoin(vendors, eq(vehicleServices.vendorId, vendors.id))
      .where(eq(vehicleServices.vehicleId, vehicleId))
      .orderBy(desc(vehicleServices.date));

    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching vehicle services:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle services" },
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

    if (!body.description || !body.date) {
      return NextResponse.json(
        { error: "Description and date are required" },
        { status: 400 }
      );
    }

    const result = await db.insert(vehicleServices).values({
      vehicleId,
      date: body.date,
      odometer: body.odometer || null,
      vendorId: body.vendorId || null,
      cost: body.cost || null,
      description: body.description,
      serviceType: body.serviceType || null,
      receiptUrl: body.receiptUrl || null,
      isDiy: body.isDiy ? 1 : 0,
      notes: body.notes || null,
      createdAt: null,
    });

    // Update vehicle odometer if service odometer is higher
    if (body.odometer) {
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
    }

    return NextResponse.json(
      { success: true, id: Number(result.lastInsertRowid) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating vehicle service:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle service" },
      { status: 500 }
    );
  }
}
