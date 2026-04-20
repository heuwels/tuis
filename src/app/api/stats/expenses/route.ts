import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  completions,
  vehicleServices,
  fuelLogs,
  quotes,
  vehicles,
  vendors,
} from "@/lib/db/schema";
import { sql, eq, gte, lte, and } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

/**
 * Parse a text cost value like "$50", "50.00", "$1,234.56" into a number.
 * Returns null if unparseable.
 */
function parseCostText(value: string | null): number | null {
  if (!value) return null;
  // Strip currency symbols, commas, whitespace
  const cleaned = value.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

interface MonthlyExpense {
  month: string;
  maintenance: number;
  fuel: number;
  quotes: number;
  total: number;
}

interface CategoryBreakdown {
  category: string;
  total: number;
}

interface VendorSpend {
  vendorId: number;
  vendorName: string;
  total: number;
}

interface VehicleCostSummary {
  vehicleId: number;
  vehicleName: string;
  fuel: number;
  services: number;
  total: number;
}

export async function GET(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "month";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    // Default ranges: last 12 months for month view, last 5 years for year view
    const now = new Date();
    let fromDate: string;
    let toDate: string;

    if (from) {
      fromDate = `${from}-01`;
    } else if (period === "year") {
      fromDate = `${now.getFullYear() - 4}-01-01`;
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      fromDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    }

    if (to) {
      // End of the given month
      const [y, m] = to.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      toDate = `${to}-${String(lastDay).padStart(2, "0")}`;
    } else {
      toDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }

    // ── Fetch raw data ──────────────────────────────────────────────────

    // 1. Task completions with cost (text field, needs parsing)
    const rawCompletions = await db
      .select({
        completedAt: completions.completedAt,
        cost: completions.cost,
        vendorId: completions.vendorId,
      })
      .from(completions)
      .where(
        and(
          sql`${completions.cost} IS NOT NULL`,
          gte(completions.completedAt, fromDate),
          lte(completions.completedAt, toDate)
        )
      );

    // 2. Vehicle services
    const rawServices = await db
      .select({
        date: vehicleServices.date,
        cost: vehicleServices.cost,
        vehicleId: vehicleServices.vehicleId,
        vendorId: vehicleServices.vendorId,
      })
      .from(vehicleServices)
      .where(
        and(
          sql`${vehicleServices.cost} IS NOT NULL`,
          gte(vehicleServices.date, fromDate),
          lte(vehicleServices.date, toDate)
        )
      );

    // 3. Fuel logs
    const rawFuel = await db
      .select({
        date: fuelLogs.date,
        costTotal: fuelLogs.costTotal,
        vehicleId: fuelLogs.vehicleId,
      })
      .from(fuelLogs)
      .where(
        and(
          gte(fuelLogs.date, fromDate),
          lte(fuelLogs.date, toDate)
        )
      );

    // 4. Accepted quotes
    const rawQuotes = await db
      .select({
        receivedDate: quotes.receivedDate,
        createdAt: quotes.createdAt,
        total: quotes.total,
        vendorId: quotes.vendorId,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.status, "accepted"),
          sql`COALESCE(${quotes.receivedDate}, ${quotes.createdAt}) >= ${fromDate}`,
          sql`COALESCE(${quotes.receivedDate}, ${quotes.createdAt}) <= ${toDate}`
        )
      );

    // 5. All vehicles for names
    const allVehicles = await db
      .select({ id: vehicles.id, name: vehicles.name })
      .from(vehicles);
    const vehicleMap = new Map(allVehicles.map((v) => [v.id, v.name]));

    // 6. All vendors for names
    const allVendors = await db
      .select({ id: vendors.id, name: vendors.name })
      .from(vendors);
    const vendorMap = new Map(allVendors.map((v) => [v.id, v.name]));

    // ── Aggregate monthly data ──────────────────────────────────────────

    function periodKey(dateStr: string): string {
      if (period === "year") return dateStr.substring(0, 4);
      return dateStr.substring(0, 7);
    }

    const monthlyMap = new Map<string, MonthlyExpense>();

    function getMonth(key: string): MonthlyExpense {
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month: key,
          maintenance: 0,
          fuel: 0,
          quotes: 0,
          total: 0,
        });
      }
      return monthlyMap.get(key)!;
    }

    // Task completions → maintenance category
    for (const row of rawCompletions) {
      const cost = parseCostText(row.cost);
      if (cost === null || cost <= 0) continue;
      const key = periodKey(row.completedAt);
      const m = getMonth(key);
      m.maintenance += cost;
      m.total += cost;
    }

    // Vehicle services → maintenance category
    for (const row of rawServices) {
      if (!row.cost || row.cost <= 0) continue;
      const key = periodKey(row.date);
      const m = getMonth(key);
      m.maintenance += row.cost;
      m.total += row.cost;
    }

    // Fuel logs → fuel category
    for (const row of rawFuel) {
      if (!row.costTotal || row.costTotal <= 0) continue;
      const key = periodKey(row.date);
      const m = getMonth(key);
      m.fuel += row.costTotal;
      m.total += row.costTotal;
    }

    // Accepted quotes → quotes category
    for (const row of rawQuotes) {
      if (!row.total || row.total <= 0) continue;
      const dateStr = row.receivedDate || row.createdAt || "";
      if (!dateStr) continue;
      const key = periodKey(dateStr);
      const m = getMonth(key);
      m.quotes += row.total;
      m.total += row.total;
    }

    const monthlyTotals = Array.from(monthlyMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    // ── Category breakdown ──────────────────────────────────────────────

    let totalMaintenance = 0;
    let totalFuel = 0;
    let totalQuotes = 0;

    for (const m of monthlyTotals) {
      totalMaintenance += m.maintenance;
      totalFuel += m.fuel;
      totalQuotes += m.quotes;
    }

    const categoryBreakdown: CategoryBreakdown[] = [
      { category: "Maintenance", total: Math.round(totalMaintenance * 100) / 100 },
      { category: "Fuel", total: Math.round(totalFuel * 100) / 100 },
      { category: "Quotes", total: Math.round(totalQuotes * 100) / 100 },
    ].filter((c) => c.total > 0);

    // ── Top vendors ─────────────────────────────────────────────────────

    const vendorTotals = new Map<number, number>();

    for (const row of rawCompletions) {
      if (!row.vendorId) continue;
      const cost = parseCostText(row.cost);
      if (cost === null || cost <= 0) continue;
      vendorTotals.set(row.vendorId, (vendorTotals.get(row.vendorId) || 0) + cost);
    }

    for (const row of rawServices) {
      if (!row.vendorId || !row.cost || row.cost <= 0) continue;
      vendorTotals.set(
        row.vendorId,
        (vendorTotals.get(row.vendorId) || 0) + row.cost
      );
    }

    for (const row of rawQuotes) {
      if (!row.vendorId || !row.total || row.total <= 0) continue;
      vendorTotals.set(
        row.vendorId,
        (vendorTotals.get(row.vendorId) || 0) + row.total
      );
    }

    const topVendors: VendorSpend[] = Array.from(vendorTotals.entries())
      .map(([vendorId, total]) => ({
        vendorId,
        vendorName: vendorMap.get(vendorId) || "Unknown",
        total: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // ── Per-vehicle cost summary ────────────────────────────────────────

    const vehicleFuel = new Map<number, number>();
    const vehicleServiceCost = new Map<number, number>();

    for (const row of rawFuel) {
      if (!row.costTotal || row.costTotal <= 0) continue;
      vehicleFuel.set(
        row.vehicleId,
        (vehicleFuel.get(row.vehicleId) || 0) + row.costTotal
      );
    }

    for (const row of rawServices) {
      if (!row.cost || row.cost <= 0) continue;
      vehicleServiceCost.set(
        row.vehicleId,
        (vehicleServiceCost.get(row.vehicleId) || 0) + row.cost
      );
    }

    const vehicleIds = new Set([
      ...vehicleFuel.keys(),
      ...vehicleServiceCost.keys(),
    ]);

    const vehicleSummaries: VehicleCostSummary[] = Array.from(vehicleIds)
      .map((vehicleId) => {
        const fuel = vehicleFuel.get(vehicleId) || 0;
        const services = vehicleServiceCost.get(vehicleId) || 0;
        return {
          vehicleId,
          vehicleName: vehicleMap.get(vehicleId) || "Unknown",
          fuel: Math.round(fuel * 100) / 100,
          services: Math.round(services * 100) / 100,
          total: Math.round((fuel + services) * 100) / 100,
        };
      })
      .sort((a, b) => b.total - a.total);

    // ── Grand total ─────────────────────────────────────────────────────

    const grandTotal =
      Math.round((totalMaintenance + totalFuel + totalQuotes) * 100) / 100;

    return NextResponse.json({
      period,
      from: fromDate,
      to: toDate,
      grandTotal,
      monthlyTotals,
      categoryBreakdown,
      topVendors,
      vehicleSummaries,
    });
  } catch (error) {
    console.error("Error fetching expense stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense stats" },
      { status: 500 }
    );
  }
}
