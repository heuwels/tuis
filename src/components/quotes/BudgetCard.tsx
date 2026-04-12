"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";

interface BudgetData {
  found: boolean;
  budgeted: number;
  spent: number;
  remaining: number;
  categoryName: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

export function BudgetCard({ quotesTotal }: { quotesTotal: number }) {
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/quotes/budget")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setBudget)
      .catch(() => setError(true));
  }, []);

  if (error || !budget || !budget.found) return null;

  const isOverBudget = budget.remaining < 0;
  const afterQuotes = budget.remaining - quotesTotal;
  const pendingQuotesExceed = quotesTotal > 0 && afterQuotes < 0;

  return (
    <Card className={isOverBudget ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30" : "bg-green-50/50 dark:bg-green-950/30 border-green-200 dark:border-green-800"}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isOverBudget ? "bg-red-100 dark:bg-red-950" : "bg-green-100 dark:bg-green-950"}`}>
            <Wallet className={`h-5 w-5 ${isOverBudget ? "text-red-600" : "text-green-600"}`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{budget.categoryName} Balance</p>
            <p className={`text-2xl font-bold ${isOverBudget ? "text-red-600" : "text-green-700"}`}>
              {isOverBudget && "-"}{formatCurrency(budget.remaining)}
            </p>
          </div>
        </div>
        {quotesTotal > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">After pending quotes</p>
            <p className={`text-lg font-semibold ${pendingQuotesExceed ? "text-red-600" : "text-green-600"}`}>
              {pendingQuotesExceed && "-"}{formatCurrency(afterQuotes)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
