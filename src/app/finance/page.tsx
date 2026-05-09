"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ExpenseList } from "@/components/finance/ExpenseList";
import { EquityOverview } from "@/components/finance/EquityOverview";
import { PaymentsTab } from "@/components/finance/PaymentsTab";
import { cn } from "@/lib/utils";
import { useCurrentHousehold } from "@/lib/household";

type Tab = "equity" | "payments" | "expenses";

export default function FinancePage() {
  const { currentHousehold } = useCurrentHousehold();
  const [activeTab, setActiveTab] = useState<Tab>("equity");
  const [propertyState, setPropertyState] = useState<{
    id: number | null;
    hid: number | undefined;
  }>({ id: null, hid: undefined });

  // Derived: the previously-selected property only counts if it belongs to
  // the household that was active when it was set. When currentHousehold
  // changes, this falls back to null without an effect.
  const propertyId =
    propertyState.hid === currentHousehold?.id ? propertyState.id : null;

  const handlePropertyId = useCallback(
    (id: number) => {
      setPropertyState({
        id: id || null,
        hid: currentHousehold?.id,
      });
    },
    [currentHousehold?.id]
  );

  const actions =
    activeTab === "expenses" ? (
      <Button
        onClick={() => {
          window.dispatchEvent(new CustomEvent("open-expense-form"));
        }}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Expense
      </Button>
    ) : null;

  return (
    <AppLayout title="Finance" actions={actions}>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {(["equity", "payments", "expenses"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "equity" && (
        <EquityOverview onPropertyId={handlePropertyId} />
      )}
      {activeTab === "payments" && <PaymentsTab propertyId={propertyId} />}
      {activeTab === "expenses" && <ExpenseList />}
    </AppLayout>
  );
}
