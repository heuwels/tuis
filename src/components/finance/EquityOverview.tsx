"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { MetricCard, MultiLineChart } from "@/components/charts";
import type { MetricConfig } from "@/components/charts";
import { PropertySetup } from "@/components/finance/PropertySetup";
import { Property } from "@/types";
import { format, parse } from "date-fns";

const formatCurrency = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface TimelineEntry {
  month: string;
  estimatedValue: number;
  cumulativePrincipal: number;
  loanBalance: number;
  equity: number;
  income: number;
  netCashflow: number;
}

interface EquityData {
  currentValue: number;
  loanBalance: number;
  totalEquity: number;
  equityFromPrincipal: number;
  equityFromAppreciation: number;
  lvr: number | null;
  currentRate: number | null;
  totalIncome: number;
  totalCosts: number;
  netCashflow: number;
  grossYield: number | null;
  paymentSummary: {
    totalPaid: number;
    totalInterest: number;
    totalPrincipal: number;
    avgMonthlyPayment: number;
  };
  monthlyTimeline: TimelineEntry[];
}

function formatMonth(yyyymm: string): string {
  const d = parse(yyyymm, "yyyy-MM", new Date());
  return format(d, "MMM yy");
}

const timelineMetrics: MetricConfig<TimelineEntry>[] = [
  {
    key: "estimatedValue",
    getValue: (d) => d.estimatedValue,
    label: "Estimated Value",
    color: "text-green-600",
    dotColor: "bg-green-600",
    strokeColor: "#16a34a",
    format: (v: number) => formatCurrency.format(v),
  },
  {
    key: "loanBalance",
    getValue: (d) => d.loanBalance,
    label: "Loan Balance",
    color: "text-red-500",
    dotColor: "bg-red-500",
    strokeColor: "#ef4444",
    format: (v: number) => formatCurrency.format(v),
  },
  {
    key: "equity",
    getValue: (d) => d.equity,
    label: "Equity",
    color: "text-blue-500",
    dotColor: "bg-blue-500",
    strokeColor: "#3b82f6",
    format: (v: number) => formatCurrency.format(v),
  },
];

export function EquityOverview({
  onPropertyId,
}: {
  onPropertyId: (id: number) => void;
}) {
  const [property, setProperty] = useState<Property | null>(null);
  const [equity, setEquity] = useState<EquityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/properties");
      if (!res.ok) return;
      const props: Property[] = await res.json();
      if (props.length === 0) {
        setProperty(null);
        return;
      }

      const prop = props[0];
      setProperty(prop);
      onPropertyId(prop.id);

      const eqRes = await fetch(`/api/finance/properties/${prop.id}/equity`);
      if (eqRes.ok) {
        setEquity(await eqRes.json());
      }
    } catch (error) {
      console.error("Error fetching equity data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [onPropertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <p className="text-center text-muted-foreground py-12">
        Loading equity data...
      </p>
    );
  }

  if (!property) {
    return (
      <PropertySetup
        onPropertyCreated={(id) => {
          onPropertyId(id);
          fetchData();
        }}
      />
    );
  }

  if (!equity) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No equity data available. Add mortgage payments and valuations to see
        your equity overview.
      </p>
    );
  }

  const totalEquityBar =
    equity.equityFromPrincipal + equity.equityFromAppreciation;
  const principalPct =
    totalEquityBar > 0
      ? (equity.equityFromPrincipal / totalEquityBar) * 100
      : 50;

  const hasIncome = equity.monthlyTimeline.some((e) => e.income > 0);
  const activeTimelineMetrics: MetricConfig<TimelineEntry>[] = hasIncome
    ? [
        ...timelineMetrics,
        {
          key: "income",
          getValue: (d: TimelineEntry) => d.income,
          label: "Income",
          color: "text-emerald-500",
          dotColor: "bg-emerald-500",
          strokeColor: "#10b981",
          format: (v: number) => formatCurrency.format(v),
        },
      ]
    : timelineMetrics;

  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard
          label="Current Value"
          value={formatCurrency.format(equity.currentValue)}
          color="green"
        />
        <MetricCard
          label="Loan Balance"
          value={formatCurrency.format(equity.loanBalance)}
          subValue={
            equity.currentRate !== null
              ? `Rate: ${(equity.currentRate * 100).toFixed(2)}%`
              : undefined
          }
          color="red"
        />
        <MetricCard
          label="Total Equity"
          value={formatCurrency.format(equity.totalEquity)}
          color="blue"
        />
        <MetricCard
          label="LVR"
          value={
            equity.lvr !== null ? `${(equity.lvr * 100).toFixed(1)}%` : "N/A"
          }
          color="amber"
        />
        {equity.totalIncome > 0 && (
          <MetricCard
            label="Net Cashflow"
            value={`${equity.netCashflow >= 0 ? "+" : ""}${formatCurrency.format(equity.netCashflow)}`}
            color={equity.netCashflow >= 0 ? "green" : "red"}
          />
        )}
        {equity.totalIncome > 0 && (
          <MetricCard
            label="Gross Yield"
            value={
              equity.grossYield !== null
                ? `${(equity.grossYield * 100).toFixed(1)}%`
                : "\u2014"
            }
            color="purple"
          />
        )}
      </div>

      {/* Equity Breakdown */}
      {totalEquityBar > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
          <p className="text-sm font-medium mb-2">Equity Breakdown</p>
          <div className="flex h-6 rounded overflow-hidden">
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${principalPct}%` }}
              title={`From payments: ${formatCurrency.format(equity.equityFromPrincipal)}`}
            />
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${100 - principalPct}%` }}
              title={`From appreciation: ${formatCurrency.format(equity.equityFromAppreciation)}`}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              From payments: {formatCurrency.format(equity.equityFromPrincipal)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              From appreciation:{" "}
              {formatCurrency.format(equity.equityFromAppreciation)}
            </span>
          </div>
        </div>
      )}

      {/* Timeline Chart */}
      {equity.monthlyTimeline.length >= 2 && (
        <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
          <MultiLineChart
            data={equity.monthlyTimeline}
            metrics={activeTimelineMetrics}
            getLabel={(d) => formatMonth(d.month)}
            title="Equity Over Time"
          />
        </div>
      )}

      {/* Payment Summary */}
      {equity.paymentSummary.totalPaid > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
          <p className="text-sm font-medium mb-2">Payment Summary</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="font-medium">
                {formatCurrency.format(equity.paymentSummary.totalPaid)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Interest</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {formatCurrency.format(equity.paymentSummary.totalInterest)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Principal</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {formatCurrency.format(equity.paymentSummary.totalPrincipal)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span className="text-muted-foreground">Avg Monthly Payment</span>
              <span className="font-medium">
                {formatCurrency.format(equity.paymentSummary.avgMonthlyPayment)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Edit Property
        </Button>
      </div>

      <PropertySetup
        property={property}
        open={editOpen}
        onOpenChange={setEditOpen}
        onPropertyCreated={() => fetchData()}
      />
    </div>
  );
}
