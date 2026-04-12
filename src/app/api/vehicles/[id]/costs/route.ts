import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicles, vehicleServices, fuelLogs } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

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

    // Total fuel cost and litres
    const [fuelSummary] = await db
      .select({
        totalCost: sql<number>`COALESCE(SUM(${fuelLogs.costTotal}), 0)`,
        totalLitres: sql<number>`COALESCE(SUM(${fuelLogs.litres}), 0)`,
        minOdometer: sql<number>`MIN(${fuelLogs.odometer})`,
        maxOdometer: sql<number>`MAX(${fuelLogs.odometer})`,
      })
      .from(fuelLogs)
      .where(eq(fuelLogs.vehicleId, vehicleId));

    // Total service cost
    const [serviceSummary] = await db
      .select({
        totalCost: sql<number>`COALESCE(SUM(${vehicleServices.cost}), 0)`,
      })
      .from(vehicleServices)
      .where(eq(vehicleServices.vehicleId, vehicleId));

    const totalFuelCost = fuelSummary?.totalCost ?? 0;
    const totalServiceCost = serviceSummary?.totalCost ?? 0;
    const totalFuelLitres = fuelSummary?.totalLitres ?? 0;
    const minOdo = fuelSummary?.minOdometer;
    const maxOdo = fuelSummary?.maxOdometer;
    const totalKmTracked = minOdo && maxOdo ? maxOdo - minOdo : 0;

    const totalCost = totalFuelCost + totalServiceCost;
    const costPerKm = totalKmTracked > 0 ? totalCost / totalKmTracked : null;
    const avgFuelConsumption = totalKmTracked > 0
      ? (totalFuelLitres / totalKmTracked) * 100
      : null;

    return NextResponse.json({
      totalFuelCost,
      totalServiceCost,
      totalCost,
      totalFuelLitres,
      totalKmTracked,
      costPerKm,
      avgFuelConsumption,
    });
  } catch (error) {
    console.error("Error fetching vehicle costs:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle costs" },
      { status: 500 }
    );
  }
}
