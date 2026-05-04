"use client";

import { useCurrentHousehold } from "@/lib/household";
import { Home, ChevronsUpDown } from "lucide-react";

export function HouseholdSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { currentHousehold, households, setIsSelecting } =
    useCurrentHousehold();

  // Don't render if only one household
  if (households.length <= 1) return null;

  if (!currentHousehold) return null;

  return (
    <button
      onClick={() => setIsSelecting(true)}
      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-sidebar-accent/50 transition-colors text-sidebar-foreground"
      title={collapsed ? currentHousehold.name : undefined}
    >
      <Home className="h-4 w-4 flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="truncate flex-1 text-left">
            {currentHousehold.name}
          </span>
          <ChevronsUpDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        </>
      )}
    </button>
  );
}
