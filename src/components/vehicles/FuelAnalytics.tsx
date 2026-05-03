"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { format, parse } from "date-fns";
import { BarChart, MultiLineChart, MetricCard } from "@/components/charts";
import type { MetricConfig } from "@/components/charts";

interface MonthlyData {
  month: string;
  avgPricePerLitre: number | null;
  distanceKm: number | null;
  fuelEconomy: number | null;
  totalSpend: number;
  litres: number;
}

interface KeyMetrics {
  rolling3MonthPrice: number | null;
  allTimePrice: number | null;
  avgMonthlyDistance: number | null;
  recentCostPerKm: number | null;
  priorCostPerKm: number | null;
}

interface SpendBreakdown {
  currentMonth: string;
  previousMonth: string;
  currentSpend: number;
  previousSpend: number;
  spendDelta: number;
  priceEffect: number;
  volumeEffect: number;
}

interface FuelAnalyticsData {
  monthlyData: MonthlyData[];
  keyMetrics: KeyMetrics | null;
  spendBreakdown: SpendBreakdown | null;
}

function formatMonth(yyyymm: string): string {
  const d = parse(yyyymm, "yyyy-MM", new Date());
  return format(d, "MMM yy");
}

const multiLineMetrics: MetricConfig<MonthlyData>[] = [
  {
    key: "avgPricePerLitre",
    getValue: (d) => d.avgPricePerLitre,
    label: "Fuel Price",
    color: "text-red-500",
    dotColor: "bg-red-500",
    strokeColor: "#ef4444",
    format: (v: number) => `$${v.toFixed(3)}/L`,
  },
  {
    key: "fuelEconomy",
    getValue: (d) => d.fuelEconomy,
    label: "Economy",
    color: "text-blue-500",
    dotColor: "bg-blue-500",
    strokeColor: "#3b82f6",
    format: (v: number) => `${v.toFixed(1)} L/100km`,
  },
  {
    key: "totalSpend",
    getValue: (d) => d.totalSpend,
    label: "Total Spend",
    color: "text-green-600",
    dotColor: "bg-green-600",
    strokeColor: "#16a34a",
    format: (v: number) => `$${v.toFixed(0)}`,
  },
];

export function FuelAnalytics({ vehicleId }: { vehicleId: number }) {
  const [analytics, setAnalytics] = useState<FuelAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/vehicles/${vehicleId}/fuel-analytics`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [vehicleId]);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Loading analytics...
      </p>
    );
  }

  if (!analytics || analytics.monthlyData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Need at least 2 fuel logs to show analytics.
      </p>
    );
  }

  const { monthlyData, keyMetrics, spendBreakdown } = analytics;

  // Show last 12 months max for charts
  const chartData = monthlyData.slice(-12);

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      {keyMetrics && (
        <div className="grid grid-cols-2 gap-3">
          {keyMetrics.rolling3MonthPrice !== null && (
            <MetricCard
              label="Avg Price (3 mo)"
              value={`$${keyMetrics.rolling3MonthPrice.toFixed(3)}/L`}
              subValue={
                keyMetrics.allTimePrice
                  ? `All-time: $${keyMetrics.allTimePrice.toFixed(3)}/L`
                  : undefined
              }
              color="red"
            />
          )}
          {keyMetrics.avgMonthlyDistance !== null && (
            <MetricCard
              label="Avg Monthly Distance"
              value={`${Math.round(keyMetrics.avgMonthlyDistance).toLocaleString()} km`}
              color="blue"
            />
          )}
          {keyMetrics.recentCostPerKm !== null && (
            <MetricCard
              label="Cost/km (3 mo)"
              value={`$${keyMetrics.recentCostPerKm.toFixed(2)}/km`}
              subValue={
                keyMetrics.priorCostPerKm
                  ? `Prior 3 mo: $${keyMetrics.priorCostPerKm.toFixed(2)}/km`
                  : undefined
              }
              color="green"
            />
          )}
          {(() => {
            const economyMonths = chartData.filter((m) => m.fuelEconomy);
            if (economyMonths.length === 0) return null;
            const latest = economyMonths[economyMonths.length - 1];
            return (
              <MetricCard
                label="Latest Economy"
                value={`${latest.fuelEconomy!.toFixed(1)} L/100km`}
                color="amber"
              />
            );
          })()}
        </div>
      )}

      {/* Spend Breakdown */}
      {spendBreakdown && (
        <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
          <p className="text-sm font-medium mb-2">Month-on-Month Breakdown</p>
          <div className="flex items-center gap-2 text-sm mb-2">
            <span className="text-muted-foreground">
              {formatMonth(spendBreakdown.previousMonth)}
            </span>
            <span className="font-medium">
              ${spendBreakdown.previousSpend.toFixed(0)}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {formatMonth(spendBreakdown.currentMonth)}
            </span>
            <span className="font-medium">
              ${spendBreakdown.currentSpend.toFixed(0)}
            </span>
            {spendBreakdown.spendDelta !== 0 && (
              <span
                className={
                  spendBreakdown.spendDelta > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }
              >
                {spendBreakdown.spendDelta > 0 ? (
                  <TrendingUp className="h-3 w-3 inline mr-0.5" />
                ) : (
                  <TrendingDown className="h-3 w-3 inline mr-0.5" />
                )}
                {spendBreakdown.spendDelta > 0 ? "+" : ""}$
                {spendBreakdown.spendDelta.toFixed(0)}
              </span>
            )}
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                From price changes
              </span>
              <span
                className={
                  spendBreakdown.priceEffect > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }
              >
                {spendBreakdown.priceEffect > 0 ? "+" : ""}$
                {spendBreakdown.priceEffect.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                From volume changes
              </span>
              <span
                className={
                  spendBreakdown.volumeEffect > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }
              >
                {spendBreakdown.volumeEffect > 0 ? "+" : ""}$
                {spendBreakdown.volumeEffect.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Spend Chart */}
      <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
        <BarChart
          data={chartData}
          getKey={(d) => d.month}
          getValue={(d) => d.totalSpend}
          formatValue={(v) => `$${v.toFixed(0)}`}
          formatLabel={(d) => formatMonth(d.month)}
          barColor="#22c55e"
          label="Monthly Spend"
        />
      </div>

      {/* Fuel Price Trend */}
      <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
        <BarChart
          data={chartData}
          getKey={(d) => d.month}
          getValue={(d) => d.avgPricePerLitre}
          formatValue={(v) => `$${v.toFixed(3)}/L`}
          formatLabel={(d) => formatMonth(d.month)}
          barColor="#f87171"
          label="Average Fuel Price ($/L)"
        />
      </div>

      {/* Distance per Month */}
      <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
        <BarChart
          data={chartData}
          getKey={(d) => d.month}
          getValue={(d) => d.distanceKm}
          formatValue={(v) => `${v.toLocaleString()} km`}
          formatLabel={(d) => formatMonth(d.month)}
          barColor="#3b82f6"
          label="Distance per Month"
        />
      </div>

      {/* Multi-line overlay */}
      <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
        <MultiLineChart
          data={chartData}
          metrics={multiLineMetrics}
          getLabel={(d) => formatMonth(d.month)}
          title="Price vs Economy vs Spend"
        />
      </div>
    </div>
  );
}
