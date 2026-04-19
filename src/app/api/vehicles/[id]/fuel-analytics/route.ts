import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fuelLogs } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { format, subMonths } from "date-fns";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

interface MonthlyBucket {
  month: string; // YYYY-MM
  totalSpend: number;
  totalLitres: number;
  priceSum: number;
  priceCount: number;
  minOdometer: number;
  maxOdometer: number;
  economyLitres: number;
  economyKm: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { id } = await params;
    const vehicleId = parseInt(id);

    const logs = await db
      .select()
      .from(fuelLogs)
      .where(eq(fuelLogs.vehicleId, vehicleId))
      .orderBy(asc(fuelLogs.date), asc(fuelLogs.odometer));

    if (logs.length < 2) {
      return NextResponse.json({
        monthlyData: [],
        keyMetrics: null,
        spendBreakdown: null,
      });
    }

    // Build monthly buckets
    const buckets = new Map<string, MonthlyBucket>();

    for (const log of logs) {
      const month = log.date.substring(0, 7); // YYYY-MM
      let bucket = buckets.get(month);
      if (!bucket) {
        bucket = {
          month,
          totalSpend: 0,
          totalLitres: 0,
          priceSum: 0,
          priceCount: 0,
          minOdometer: Infinity,
          maxOdometer: -Infinity,
          economyLitres: 0,
          economyKm: 0,
        };
        buckets.set(month, bucket);
      }
      bucket.totalSpend += log.costTotal;
      bucket.totalLitres += log.litres;
      if (log.costPerLitre) {
        bucket.priceSum += log.costPerLitre;
        bucket.priceCount += 1;
      }
      bucket.minOdometer = Math.min(bucket.minOdometer, log.odometer);
      bucket.maxOdometer = Math.max(bucket.maxOdometer, log.odometer);
    }

    // Calculate per-fill economy (consecutive full-tank fills)
    let lastFullTankOdo: number | null = null;

    for (const log of logs) {
      const isFull = log.isFullTank === 1;
      const month = log.date.substring(0, 7);

      if (lastFullTankOdo === null) {
        if (isFull) {
          lastFullTankOdo = log.odometer;
        }
        continue;
      }

      if (isFull) {
        const distance = log.odometer - lastFullTankOdo;
        if (distance > 0) {
          const bucket = buckets.get(month);
          if (bucket) {
            bucket.economyLitres += log.litres;
            bucket.economyKm += distance;
          }
        }
        lastFullTankOdo = log.odometer;
      }
    }

    // Convert to sorted array
    const monthlyData = Array.from(buckets.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((b) => ({
        month: b.month,
        avgPricePerLitre: b.priceCount > 0 ? b.priceSum / b.priceCount : null,
        distanceKm:
          b.maxOdometer > b.minOdometer
            ? b.maxOdometer - b.minOdometer
            : null,
        fuelEconomy:
          b.economyKm > 0
            ? (b.economyLitres / b.economyKm) * 100
            : null,
        totalSpend: b.totalSpend,
        litres: b.totalLitres,
      }));

    // Key metrics
    const now = new Date();
    const threeMonthsAgo = format(subMonths(now, 3), "yyyy-MM");

    const recentLogs = logs.filter(
      (l) => l.date.substring(0, 7) >= threeMonthsAgo
    );
    const rolling3MonthPrice =
      recentLogs.length > 0
        ? recentLogs.reduce((sum, l) => sum + (l.costPerLitre ?? 0), 0) /
          recentLogs.filter((l) => l.costPerLitre).length
        : null;

    const allTimePrice =
      logs.filter((l) => l.costPerLitre).length > 0
        ? logs.reduce((sum, l) => sum + (l.costPerLitre ?? 0), 0) /
          logs.filter((l) => l.costPerLitre).length
        : null;

    // Monthly distances for average
    const monthsWithDistance = monthlyData.filter((m) => m.distanceKm);
    const avgMonthlyDistance =
      monthsWithDistance.length > 0
        ? monthsWithDistance.reduce((sum, m) => sum + (m.distanceKm ?? 0), 0) /
          monthsWithDistance.length
        : null;

    // Cost per km trend (last 3 months vs prior 3 months)
    const sixMonthsAgo = format(subMonths(now, 6), "yyyy-MM");
    const recent3 = monthlyData.filter(
      (m) => m.month >= threeMonthsAgo
    );
    const prior3 = monthlyData.filter(
      (m) => m.month >= sixMonthsAgo && m.month < threeMonthsAgo
    );

    const recentCostPerKm = calcCostPerKm(recent3);
    const priorCostPerKm = calcCostPerKm(prior3);

    // Spend breakdown: current month vs previous month
    const currentMonth = format(now, "yyyy-MM");
    const prevMonth = format(subMonths(now, 1), "yyyy-MM");
    const currentData = monthlyData.find((m) => m.month === currentMonth);
    const prevData = monthlyData.find((m) => m.month === prevMonth);

    let spendBreakdown = null;
    if (currentData && prevData && prevData.totalSpend > 0) {
      const spendDelta = currentData.totalSpend - prevData.totalSpend;

      // Decompose: price effect, distance effect, economy effect
      const curPrice = currentData.avgPricePerLitre ?? 0;
      const prevPrice = prevData.avgPricePerLitre ?? 0;
      const curLitres = currentData.litres;
      const prevLitres = prevData.litres;

      // Price effect: change in price * previous volume
      const priceEffect = (curPrice - prevPrice) * prevLitres;
      // Volume effect: change in volume * previous price
      const volumeEffect = (curLitres - prevLitres) * prevPrice;

      spendBreakdown = {
        currentMonth,
        previousMonth: prevMonth,
        currentSpend: currentData.totalSpend,
        previousSpend: prevData.totalSpend,
        spendDelta,
        priceEffect,
        volumeEffect,
      };
    }

    return NextResponse.json({
      monthlyData,
      keyMetrics: {
        rolling3MonthPrice,
        allTimePrice,
        avgMonthlyDistance,
        recentCostPerKm,
        priorCostPerKm,
      },
      spendBreakdown,
    });
  } catch (error) {
    console.error("Error fetching fuel analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch fuel analytics" },
      { status: 500 }
    );
  }
}

function calcCostPerKm(
  months: { totalSpend: number; distanceKm: number | null }[]
): number | null {
  const totalSpend = months.reduce((s, m) => s + m.totalSpend, 0);
  const totalKm = months.reduce((s, m) => s + (m.distanceKm ?? 0), 0);
  return totalKm > 0 ? totalSpend / totalKm : null;
}
