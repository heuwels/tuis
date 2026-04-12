#!/bin/bash
set -e
cd /Users/luke/Sites/personal/tuis
git checkout feature/vehicles

echo "=== Fix 1: Fuel economy calculation ==="
cat > 'src/app/api/vehicles/[id]/costs/route.ts' << 'COSTSEOF'
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicles, vehicleServices, fuelLogs } from "@/lib/db/schema";
import { eq, sql, asc } from "drizzle-orm";

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

    // Calculate fuel economy from consecutive full-tank fill-ups
    const allFuelLogs = await db
      .select({
        odometer: fuelLogs.odometer,
        litres: fuelLogs.litres,
        isFullTank: fuelLogs.isFullTank,
      })
      .from(fuelLogs)
      .where(eq(fuelLogs.vehicleId, vehicleId))
      .orderBy(asc(fuelLogs.odometer));

    let totalEconomyLitres = 0;
    let totalEconomyKm = 0;
    let lastFullTankOdo: number | null = null;

    for (const log of allFuelLogs) {
      const isFull = log.isFullTank === 1 || log.isFullTank === true;
      if (lastFullTankOdo === null) {
        // First fill-up is baseline only — no economy calculated
        if (isFull) {
          lastFullTankOdo = log.odometer;
        }
        continue;
      }
      if (isFull) {
        const distance = log.odometer - lastFullTankOdo;
        if (distance > 0) {
          totalEconomyLitres += log.litres;
          totalEconomyKm += distance;
        }
        lastFullTankOdo = log.odometer;
      }
      // Skip partial fills — they don't give a reliable consumption figure
    }

    const totalFuelCost = fuelSummary?.totalCost ?? 0;
    const totalServiceCost = serviceSummary?.totalCost ?? 0;
    const totalFuelLitres = fuelSummary?.totalLitres ?? 0;
    const minOdo = fuelSummary?.minOdometer;
    const maxOdo = fuelSummary?.maxOdometer;
    const totalKmTracked = minOdo && maxOdo ? maxOdo - minOdo : 0;

    const totalCost = totalFuelCost + totalServiceCost;
    const costPerKm = totalKmTracked > 0 ? totalCost / totalKmTracked : null;
    const avgFuelConsumption = totalEconomyKm > 0
      ? (totalEconomyLitres / totalEconomyKm) * 100
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
COSTSEOF

echo "=== Fix 1b: Update seed data for realistic L/100km ==="
# RAV4: ~5.5 L/100km, Mazda 2: ~6.5 L/100km
# Adjust odometer gaps to match litres for realistic consumption
sed -i '' 's/insertFuel.run(v1id, daysAgo(28), 55800, 35.6, 66.97, 1.881, "BP Ivanhoe", 1);/insertFuel.run(v1id, daysAgo(28), 55190, 37.8, 71.12, 1.881, "BP Ivanhoe", 1);/' src/lib/db/seed-demo.ts
sed -i '' 's/insertFuel.run(v1id, daysAgo(14), 57100, 37.1, 70.12, 1.889, "Shell Heidelberg", 1);/insertFuel.run(v1id, daysAgo(14), 55870, 38.5, 72.74, 1.889, "Shell Heidelberg", 1);/' src/lib/db/seed-demo.ts
sed -i '' 's/insertFuel.run(v1id, daysAgo(3), 58320, 34.8, 68.21, 1.960, "Costco Docklands", 1);/insertFuel.run(v1id, daysAgo(3), 56510, 34.9, 68.40, 1.960, "Costco Docklands", 1);/' src/lib/db/seed-demo.ts

# Mazda 2 fuel logs
sed -i '' 's/insertFuel.run(v2id, daysAgo(35), 85200, 32.5, 61.75, 1.900, "7-Eleven Brunswick", 1);/insertFuel.run(v2id, daysAgo(35), 85700, 32.5, 61.75, 1.900, "7-Eleven Brunswick", 1);/' src/lib/db/seed-demo.ts
sed -i '' 's/insertFuel.run(v2id, daysAgo(21), 86100, 28.4, 54.72, 1.926, "United Preston", 1);/insertFuel.run(v2id, daysAgo(21), 86200, 32.5, 62.60, 1.926, "United Preston", 1);/' src/lib/db/seed-demo.ts
sed -i '' 's/insertFuel.run(v2id, daysAgo(7), 87450, 35.1, 68.45, 1.950, "Shell Heidelberg", 1);/insertFuel.run(v2id, daysAgo(7), 86730, 34.4, 67.08, 1.950, "Shell Heidelberg", 1);/' src/lib/db/seed-demo.ts

# Update vehicle current_odometer to match latest fuel log
sed -i '' 's/"JTMW43FV50D123456", "2022-03-15", 42000, 58320,/"JTMW43FV50D123456", "2022-03-15", 42000, 56510,/' src/lib/db/seed-demo.ts
sed -i '' 's/"JMZDE14L291234567", "2018-11-01", 18500, 87450,/"JMZDE14L291234567", "2018-11-01", 18500, 86730,/' src/lib/db/seed-demo.ts

# Update service odometers to be consistent with new fuel log ranges
sed -i '' 's/insertService.run(v1id, daysAgo(30), 56800, mechanicId/insertService.run(v1id, daysAgo(30), 55500, mechanicId/' src/lib/db/seed-demo.ts
sed -i '' 's/insertService.run(v2id, daysAgo(14), 87200, null/insertService.run(v2id, daysAgo(14), 86100, null/' src/lib/db/seed-demo.ts

# Update comment
sed -i '' 's/\/\/ Mazda 2 fuel logs (~6.2 L\/100km)/\/\/ Mazda 2 fuel logs (~6.5 L\/100km)/' src/lib/db/seed-demo.ts

echo "=== Fix 2: Add navigation entry ==="
# Add Car import
sed -i '' 's/  FileText,$/  FileText,\
  Car,/' src/components/layout/AppLayout.tsx

# Add vehicles nav entry after quotes
sed -i '' 's|{ href: "/quotes", label: "Quotes", icon: FileText },|{ href: "/quotes", label: "Quotes", icon: FileText },\
      { href: "/vehicles", label: "Cars", icon: Car },|' src/components/layout/AppLayout.tsx

echo "=== Fix 3: Cascade delete with transaction ==="
# Rewrite the DELETE handler in vehicles/[id]/route.ts
cat > 'src/app/api/vehicles/[id]/route.ts' << 'VEHICLEIDEOF'
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

    const result = db.transaction((tx) => {
      tx.delete(fuelLogs)
        .where(eq(fuelLogs.vehicleId, vehicleId))
        .run();
      tx.delete(vehicleServices)
        .where(eq(vehicleServices.vehicleId, vehicleId))
        .run();
      return tx.delete(vehicles)
        .where(eq(vehicles.id, vehicleId))
        .run();
    });

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
VEHICLEIDEOF

echo "=== Fix 3b: Add ON DELETE CASCADE to FK definitions ==="
# db/index.ts
sed -i '' 's/vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),$/vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,/' src/lib/db/index.ts

# seed-demo.ts
sed -i '' 's/vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),$/vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,/' src/lib/db/seed-demo.ts

echo "=== Fix 4: Vendor delete — nullify vehicle_services.vendorId ==="
cat > src/app/api/vendors/\[id\]/route.ts << 'VENDOREOF'
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors, completions, tasks, vehicleServices } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendorId = parseInt(id);

    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, vendorId));

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Get job history (completions where this vendor was used)
    const jobHistory = await db
      .select({
        id: completions.id,
        taskId: completions.taskId,
        taskName: tasks.name,
        completedAt: completions.completedAt,
        cost: completions.cost,
      })
      .from(completions)
      .innerJoin(tasks, eq(completions.taskId, tasks.id))
      .where(eq(completions.vendorId, vendorId))
      .orderBy(desc(completions.completedAt));

    return NextResponse.json({
      ...vendor,
      jobHistory,
    });
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor" },
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
    const vendorId = parseInt(id);
    const body = await request.json();

    const { name, category, phone, email, website, notes, rating } = body;

    const result = await db
      .update(vendors)
      .set({
        name: name || undefined,
        category: category || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        notes: notes || null,
        rating: rating || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(vendors.id, vendorId));

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating vendor:", error);
    return NextResponse.json(
      { error: "Failed to update vendor" },
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
    const vendorId = parseInt(id);

    // Unlink any completions that reference this vendor
    await db
      .update(completions)
      .set({ vendorId: null })
      .where(eq(completions.vendorId, vendorId));

    // Unlink any vehicle services that reference this vendor
    await db
      .update(vehicleServices)
      .set({ vendorId: null })
      .where(eq(vehicleServices.vendorId, vendorId));

    // Then delete the vendor
    const result = await db
      .delete(vendors)
      .where(eq(vendors.id, vendorId));

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return NextResponse.json(
      { error: "Failed to delete vendor" },
      { status: 500 }
    );
  }
}
VENDOREOF

echo "=== All fixes applied ==="
git diff --stat
