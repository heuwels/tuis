"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentHousehold } from "@/lib/household";
import { Home } from "lucide-react";

export function HouseholdPicker() {
  const {
    households,
    selectHousehold,
    isSelecting,
    setIsSelecting,
    currentHousehold,
  } = useCurrentHousehold();

  // Don't show if only one household (auto-selected)
  if (households.length <= 1) return null;

  return (
    <Dialog
      open={isSelecting}
      onOpenChange={(open) => {
        if (!open && currentHousehold) setIsSelecting(false);
      }}
    >
      <DialogContent
        className="sm:max-w-[360px]"
        onPointerDownOutside={(e) => !currentHousehold && e.preventDefault()}
        onEscapeKeyDown={(e) => !currentHousehold && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {currentHousehold ? "Switch Household" : "Select Household"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {households.map((household) => (
            <button
              key={household.id}
              onClick={() => selectHousehold(household.id)}
              className="flex items-center gap-3 p-4 rounded-xl border hover:bg-gray-50 dark:hover:bg-zinc-800 active:bg-gray-100 dark:active:bg-zinc-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Home className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {household.name}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
