import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicles, vehicleServices, fuelLogs, vendors } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vehicleId = parseInt(id);

    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId));

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    // Get services with vendor names
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

    // Get fuel logs
    const fuel = await db
      .select()
      .from(fuelLogs)
      .where(eq(fuelLogs.vehicleId, vehicleId))
      .orderBy(desc(fuelLogs.date));

    return NextResponse.json({
      ...vehicle,
      services,
      fuelLogs: fuel,
    });
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vehicleId = parseInt(id);
    const body = await request.json();

    const result = await db
      .update(vehicles)
      .set({
        name: body.name || undefined,
        make: body.make ?? null,
        model: body.model ?? null,
        year: body.year ?? null,
        colour: body.colour ?? null,
        regoNumber: body.regoNumber ?? null,
        regoState: body.regoState ?? null,
        vin: body.vin ?? null,
        purchaseDate: body.purchaseDate ?? null,
        purchasePrice: body.purchasePrice ?? null,
        currentOdometer: body.currentOdometer ?? null,
        imageUrl: body.imageUrl ?? null,
        regoExpiry: body.regoExpiry ?? null,
        insuranceProvider: body.insuranceProvider ?? null,
        insuranceExpiry: body.insuranceExpiry ?? null,
        warrantyExpiryDate: body.warrantyExpiryDate ?? null,
        warrantyExpiryKm: body.warrantyExpiryKm ?? null,
        notes: body.notes ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(vehicles.id, vehicleId));

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vehicleId = parseInt(id);

    // Delete related records first
    await db
      .delete(vehicleServices)
      .where(eq(vehicleServices.vehicleId, vehicleId));
    await db
      .delete(fuelLogs)
      .where(eq(fuelLogs.vehicleId, vehicleId));

    const result = await db
      .delete(vehicles)
      .where(eq(vehicles.id, vehicleId));

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json(
      { error: "Failed to delete vehicle" },
      { status: 500 }
    );
  }
}
