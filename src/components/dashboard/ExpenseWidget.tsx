"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import Link from "next/link";

interface CategoryBreakdown {
  category: string;
  total: number;
}

interface ExpenseWidgetData {
  grandTotal: number;
  categoryBreakdown: CategoryBreakdown[];
}

const CATEGORY_DOT_COLORS: Record<string, string> = {
  Maintenance: "bg-amber-500",
  Fuel: "bg-green-500",
  Quotes: "bg-blue-500",
};

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function ExpenseWidget() {
  const [data, setData] = useState<ExpenseWidgetData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Fetch current month expenses
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    fetch(`/api/stats/expenses?period=month&from=${monthStr}&to=${monthStr}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) {
          setData({
            grandTotal: json.grandTotal,
            categoryBreakdown: json.categoryBreakdown,
          });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  return (
    <Link href="/stats/expenses" className="block group">
      <Card className="h-full transition-colors group-hover:border-emerald-200 dark:group-hover:border-emerald-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Spending This Month
            {data && data.grandTotal > 0 && (
              <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full px-2 py-0.5 font-medium">
                {formatCurrency(data.grandTotal)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.categoryBreakdown.length > 0 ? (
            <div className="space-y-2">
              {data.categoryBreakdown.map((cat) => {
                const pct =
                  data.grandTotal > 0
                    ? Math.round((cat.total / data.grandTotal) * 100)
                    : 0;
                return (
                  <div key={cat.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          CATEGORY_DOT_COLORS[cat.category] || "bg-gray-500"
                        }`}
                      />
                      <span className="font-medium">{cat.category}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(cat.total)} ({pct}%)
                    </span>
                  </div>
                );
              })}
              {/* Stacked progress bar */}
              {data.grandTotal > 0 && (
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex mt-1">
                  {data.categoryBreakdown.map((cat) => {
                    const pct = (cat.total / data.grandTotal) * 100;
                    const colorClass =
                      CATEGORY_DOT_COLORS[cat.category] || "bg-gray-500";
                    return (
                      <div
                        key={cat.category}
                        className={`h-full ${colorClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No expenses this month
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
