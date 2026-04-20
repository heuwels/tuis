"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Fuel,
  Wrench,
  FileText,
  TrendingUp,
  Car,
  Store,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import Link from "next/link";

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

interface ExpenseData {
  period: string;
  from: string;
  to: string;
  grandTotal: number;
  monthlyTotals: MonthlyExpense[];
  categoryBreakdown: CategoryBreakdown[];
  topVendors: VendorSpend[];
  vehicleSummaries: VehicleCostSummary[];
}

const CATEGORY_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  Maintenance: {
    bar: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  Fuel: {
    bar: "bg-green-500",
    text: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
  Quotes: {
    bar: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
};

const CATEGORY_ICONS: Record<string, typeof DollarSign> = {
  Maintenance: Wrench,
  Fuel: Fuel,
  Quotes: FileText,
};

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatMonth(key: string): string {
  if (key.length === 4) return key; // Year
  const [y, m] = key.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

function SpendBarChart({
  data,
  label,
}: {
  data: MonthlyExpense[];
  label: string;
}) {
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.total), 0.01);

  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="flex items-end gap-1 h-32">
        {data.map((d) => {
          const height = d.total > 0 ? (d.total / maxVal) * 100 : 0;
          // Stack: fuel (bottom), maintenance (middle), quotes (top)
          const fuelPct = d.total > 0 ? (d.fuel / d.total) * height : 0;
          const maintPct = d.total > 0 ? (d.maintenance / d.total) * height : 0;
          const quotePct = d.total > 0 ? (d.quotes / d.total) * height : 0;

          return (
            <div
              key={d.month}
              className="flex-1 flex flex-col items-center gap-1 min-w-0"
            >
              <div className="w-full flex flex-col items-center justify-end h-24">
                {d.total > 0 ? (
                  <div
                    className="w-full flex flex-col-reverse rounded-t overflow-hidden min-h-[4px]"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${formatMonth(d.month)}: ${formatCurrency(d.total)}`}
                  >
                    {fuelPct > 0 && (
                      <div
                        className="w-full bg-green-500"
                        style={{ height: `${(fuelPct / height) * 100}%` }}
                      />
                    )}
                    {maintPct > 0 && (
                      <div
                        className="w-full bg-amber-500"
                        style={{ height: `${(maintPct / height) * 100}%` }}
                      />
                    )}
                    {quotePct > 0 && (
                      <div
                        className="w-full bg-blue-500"
                        style={{ height: `${(quotePct / height) * 100}%` }}
                      />
                    )}
                  </div>
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
      {/* Legend */}
      <div className="flex gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-[11px] text-muted-foreground">Fuel</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-[11px] text-muted-foreground">Maintenance</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-[11px] text-muted-foreground">Quotes</span>
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [data, setData] = useState<ExpenseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"month" | "year">("month");

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/stats/expenses?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  if (isLoading) {
    return (
      <AppLayout title="Expenses">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading expenses...</div>
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout title="Expenses">
        <div className="text-center text-muted-foreground">
          Failed to load expense data
        </div>
      </AppLayout>
    );
  }

  const chartData = data.monthlyTotals.slice(-12);

  return (
    <AppLayout title="Expenses">
      <div className="space-y-6">
        {/* Period selector + grand total */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Total spending ({period === "year" ? "yearly" : "monthly"} view)
            </p>
            <p className="text-3xl font-bold">{formatCurrency(data.grandTotal)}</p>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setPeriod("month")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                period === "month"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod("year")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                period === "year"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Category breakdown cards */}
        {data.categoryBreakdown.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.categoryBreakdown.map((cat) => {
              const colors = CATEGORY_COLORS[cat.category] || {
                bar: "bg-gray-500",
                text: "text-gray-700 dark:text-gray-400",
                bg: "bg-gray-50 dark:bg-gray-950/30",
              };
              const Icon = CATEGORY_ICONS[cat.category] || DollarSign;
              const pct =
                data.grandTotal > 0
                  ? Math.round((cat.total / data.grandTotal) * 100)
                  : 0;

              return (
                <div key={cat.category} className={`p-3 ${colors.bg} rounded-lg`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${colors.text}`} />
                    <span className="text-xs text-muted-foreground">
                      {cat.category}
                    </span>
                  </div>
                  <p className={`text-lg font-semibold ${colors.text}`}>
                    {formatCurrency(cat.total)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pct}% of total
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Spending trend chart */}
        {chartData.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Spending Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SpendBarChart
                data={chartData}
                label={period === "year" ? "Yearly Totals" : "Monthly Totals"}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-muted-foreground text-center">
                No expense data recorded yet. Costs from task completions, vehicle
                services, fuel logs, and accepted quotes will appear here.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top vendors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="h-4 w-4" />
                Top Vendors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topVendors.length > 0 ? (
                <div className="space-y-3">
                  {data.topVendors.map((vendor) => {
                    const maxVendor = data.topVendors[0]?.total || 1;
                    const pct = (vendor.total / maxVendor) * 100;
                    return (
                      <div key={vendor.vendorId} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate">
                            {vendor.vendorName}
                          </span>
                          <span className="text-muted-foreground shrink-0 ml-2">
                            {formatCurrency(vendor.total)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No vendor expenses recorded
                </p>
              )}
            </CardContent>
          </Card>

          {/* Per-vehicle costs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="h-4 w-4" />
                Vehicle Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.vehicleSummaries.length > 0 ? (
                <div className="space-y-4">
                  {data.vehicleSummaries.map((v) => (
                    <div key={v.vehicleId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {v.vehicleName}
                        </span>
                        <span className="text-sm font-semibold">
                          {formatCurrency(v.total)}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Fuel: {formatCurrency(v.fuel)}
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          Services: {formatCurrency(v.services)}
                        </span>
                      </div>
                      {v.total > 0 && (
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${(v.fuel / v.total) * 100}%`,
                            }}
                          />
                          <div
                            className="h-full bg-amber-500"
                            style={{
                              width: `${(v.services / v.total) * 100}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No vehicle expenses recorded
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Back to stats link */}
        <div className="text-center">
          <Link
            href="/stats"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Statistics
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
