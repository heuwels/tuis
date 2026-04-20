"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ExpenseList } from "@/components/finance/ExpenseList";

export default function FinancePage() {
  const actions = (
    <Button
      onClick={() => {
        window.dispatchEvent(new CustomEvent("open-expense-form"));
      }}
    >
      <Plus className="h-4 w-4 mr-2" />
      Add Expense
    </Button>
  );

  return (
    <AppLayout title="Finance" actions={actions}>
      <ExpenseList />
    </AppLayout>
  );
}
