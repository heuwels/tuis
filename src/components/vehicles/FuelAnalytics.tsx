"use client";

import { useEffect, useState } from "react";
import {
  Fuel,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  DollarSign,
  MapPin,
  Gauge,
} from "lucide-react";
import { format, parse } from "date-fns";
import { useUnitSystem } from "@/lib/useUnitSystem";
import {
  formatDistance,
  formatCostPerVolume,
  formatFuelEconomy,
  formatCostPerDistance,
  getUnitLabels,
} from "@/lib/units";

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

function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  bgClass,
  textClass,
}: {
  icon: typeof Fuel;
  label: string;
  value: string;
  subtitle?: string;
  bgClass: string;
  textClass: string;
}) {
  return (
    <div className={`p-3 ${bgClass} rounded-lg`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${textClass}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${textClass}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

function BarChart({
  data,
  getValue,
  formatValue,
  barColor,
  label,
}: {
  data: MonthlyData[];
  getValue: (d: MonthlyData) => number | null;
  formatValue: (v: number) => string;
  barColor: string;
  label: string;
}) {
  const values = data.map((d) => getValue(d) ?? 0);
  const maxVal = Math.max(...values, 0.01);

  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="flex items-end gap-1 h-28">
        {data.map((d) => {
          const val = getValue(d);
          const height = val ? (val / maxVal) * 100 : 0;
          return (
            <div
              key={d.month}
              className="flex-1 flex flex-col items-center gap-1 min-w-0"
            >
              <div className="w-full flex flex-col items-center justify-end h-24">
                {val ? (
                  <div
                    className={`w-full ${barColor} rounded-t min-h-[4px]`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${formatMonth(d.month)}: ${formatValue(val)}`}
                  />
                ) : (
                  <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-t h-[4px]" />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                {formatMonth(d.month)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MultiLineChart({ data, labels }: { data: MonthlyData[]; labels: import("@/lib/units").UnitLabels }) {
  if (data.length < 2) return null;

  const metrics = [
    {
      key: "avgPricePerLitre" as const,
      label: "Fuel Price",
      color: "text-red-500",
      dotColor: "bg-red-500",
      format: (v: number) => `$${v.toFixed(3)}/${labels.litresShort}`,
    },
    {
      key: "fuelEconomy" as const,
      label: "Economy",
      color: "text-blue-500",
      dotColor: "bg-blue-500",
      format: (v: number) => `${v.toFixed(1)} ${labels.per100km}`,
    },
    {
      key: "totalSpend" as const,
      label: "Total Spend",
      color: "text-green-600",
      dotColor: "bg-green-600",
      format: (v: number) => `$${v.toFixed(0)}`,
    },
  ];

  // SVG dimensions
  const width = 500;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xStep = data.length > 1 ? chartW / (data.length - 1) : 0;

  function normalizeSeries(
    values: (number | null)[]
  ): (number | null)[] {
    const nums = values.filter((v): v is number => v !== null);
    if (nums.length === 0) return values;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min || 1;
    return values.map((v) => (v !== null ? (v - min) / range : null));
  }

  return (
    <div>
      <p className="text-sm font-medium mb-2">
        Price vs Economy vs Spend
      </p>
      <div className="flex gap-3 mb-2">
        {metrics.map((m) => (
          <div key={m.key} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${m.dotColor}`} />
            <span className="text-[11px] text-muted-foreground">
              {m.label}
            </span>
          </div>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* X-axis labels */}
        {data.map((d, i) => {
          // Show every Nth label to avoid overlap
          const step = Math.max(1, Math.floor(data.length / 6));
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={d.month}
              x={padding.left + i * xStep}
              y={height - 2}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="9"
            >
              {formatMonth(d.month)}
            </text>
          );
        })}

        {/* Lines */}
        {metrics.map((m) => {
          const rawValues = data.map((d) => {
            const val = d[m.key];
            return typeof val === "number" ? val : null;
          });
          const normalized = normalizeSeries(rawValues);

          const points: { x: number; y: number; raw: number }[] = [];
          normalized.forEach((v, i) => {
            if (v !== null) {
              points.push({
                x: padding.left + i * xStep,
                y: padding.top + chartH - v * chartH,
                raw: rawValues[i]!,
              });
            }
          });

          if (points.length < 2) return null;

          const pathD = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

          const strokeColor =
            m.key === "avgPricePerLitre"
              ? "#ef4444"
              : m.key === "fuelEconomy"
                ? "#3b82f6"
                : "#16a34a";

          return (
            <g key={m.key}>
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="2.5"
                  fill={strokeColor}
                >
                  <title>
                    {formatMonth(data[i]?.month ?? "")}: {m.format(p.raw)}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function FuelAnalytics({ vehicleId }: { vehicleId: number }) {
  const [analytics, setAnalytics] = useState<FuelAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { unitSystem } = useUnitSystem();
  const labels = getUnitLabels(unitSystem);

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
              icon={DollarSign}
              label="Avg Price (3 mo)"
              value={formatCostPerVolume(keyMetrics.rolling3MonthPrice, unitSystem)}
              subtitle={
                keyMetrics.allTimePrice
                  ? `All-time: ${formatCostPerVolume(keyMetrics.allTimePrice, unitSystem)}`
                  : undefined
              }
              bgClass="bg-red-50 dark:bg-red-950/30"
              textClass="text-red-700 dark:text-red-400"
            />
          )}
          {keyMetrics.avgMonthlyDistance !== null && (
            <MetricCard
              icon={MapPin}
              label="Avg Monthly Distance"
              value={formatDistance(keyMetrics.avgMonthlyDistance, unitSystem)}
              bgClass="bg-blue-50 dark:bg-blue-950/30"
              textClass="text-blue-700 dark:text-blue-400"
            />
          )}
          {keyMetrics.recentCostPerKm !== null && (
            <MetricCard
              icon={Gauge}
              label={`Cost/${labels.km} (3 mo)`}
              value={formatCostPerDistance(keyMetrics.recentCostPerKm, unitSystem)}
              subtitle={
                keyMetrics.priorCostPerKm
                  ? `Prior 3 mo: ${formatCostPerDistance(keyMetrics.priorCostPerKm, unitSystem)}`
                  : undefined
              }
              bgClass="bg-green-50 dark:bg-green-950/30"
              textClass="text-green-700 dark:text-green-400"
            />
          )}
          {(() => {
            const economyMonths = chartData.filter((m) => m.fuelEconomy);
            if (economyMonths.length === 0) return null;
            const latest = economyMonths[economyMonths.length - 1];
            return (
              <MetricCard
                icon={Fuel}
                label="Latest Economy"
                value={formatFuelEconomy(latest.fuelEconomy!, unitSystem)}
                bgClass="bg-amber-50 dark:bg-amber-950/30"
                textClass="text-amber-700 dark:text-amber-400"
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
          getValue={(d) => d.totalSpend}
          formatValue={(v) => `$${v.toFixed(0)}`}
          barColor="bg-green-500"
          label="Monthly Spend"
        />
      </div>

      {/* Fuel Price Trend */}
      <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
        <BarChart
          data={chartData}
          getValue={(d) => d.avgPricePerLitre}
          formatValue={(v) => `$${v.toFixed(3)}/${labels.litresShort}`}
          barColor="bg-red-400"
          label={`Average Fuel Price ($/${labels.litresShort})`}
        />
      </div>

      {/* Distance per Month */}
      <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
        <BarChart
          data={chartData}
          getValue={(d) => d.distanceKm}
          formatValue={(v) => formatDistance(v, unitSystem)}
          barColor="bg-blue-500"
          label="Distance per Month"
        />
      </div>

      {/* Multi-line overlay */}
      <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
        <MultiLineChart data={chartData} labels={labels} />
      </div>
    </div>
  );
}
