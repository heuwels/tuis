"use client";

import { useCurrentHousehold } from "@/lib/household";
import { Home } from "lucide-react";

export function HouseholdSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { currentHousehold, households, selectHousehold } =
    useCurrentHousehold();

  if (!currentHousehold || collapsed) return null;

  // Single household — static label
  if (households.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-2 py-1">
        <Home className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
          {currentHousehold.name}
        </span>
      </div>
    );
  }

  // Multiple households — dropdown
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <Home className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
      <select
        value={currentHousehold.id}
        onChange={(e) => selectHousehold(parseInt(e.target.value))}
        className="flex-1 text-xs font-semibold uppercase tracking-wider bg-transparent border-none outline-none cursor-pointer text-sidebar-foreground truncate"
      >
        {households.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
    </div>
  );
}
