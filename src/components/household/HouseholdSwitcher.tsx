"use client";

import { useCurrentHousehold } from "@/lib/household";
import { Home, ChevronsUpDown } from "lucide-react";

export function HouseholdSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { currentHousehold, households, setIsSelecting } =
    useCurrentHousehold();

  if (!currentHousehold) {
    // Static fallback label while loading or no household
    if (collapsed) return null;
    return (
      <h3 className="px-2 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Household
      </h3>
    );
  }

  // Single household — static label (no switcher needed)
  if (households.length <= 1) {
    if (collapsed) return null;
    return (
      <div className="flex items-center gap-2 px-2 py-1">
        <Home className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
          {currentHousehold.name}
        </span>
      </div>
    );
  }

  // Multiple households — interactive switcher
  return (
    <button
      onClick={() => setIsSelecting(true)}
      className="flex items-center gap-2 w-full px-2 py-1 text-sm rounded-lg hover:bg-sidebar-accent/50 transition-colors text-sidebar-foreground"
      title={collapsed ? currentHousehold.name : undefined}
    >
      <Home className="h-3.5 w-3.5 flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="truncate flex-1 text-left text-xs font-semibold uppercase tracking-wider">
            {currentHousehold.name}
          </span>
          <ChevronsUpDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        </>
      )}
    </button>
  );
}
