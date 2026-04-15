"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Plus, X } from "lucide-react";
import { MealSlot, MEAL_SLOTS } from "@/lib/db/schema";

export interface MealEntry {
  id: number;
  date: string;
  slot: string;
  recipeId: number | null;
  servingsMultiplier?: number | null;
  customMeal: string | null;
  notes: string | null;
  recipeName?: string | null;
  recipePrepTime?: number | null;
  recipeCookTime?: number | null;
  recipeImageUrl?: string | null;
}

const SLOT_LABELS: Record<MealSlot, string> = {
  side: "Side",
  main: "Main",
  dessert: "Dessert",
};

interface MealDayProps {
  date: Date;
  meals: Record<MealSlot, MealEntry | null>;
  isToday: boolean;
  onAddMeal: (slot: MealSlot) => void;
  onClearMeal: (slot: MealSlot) => void;
  onViewRecipe: (recipeId: number) => void;
}

export function MealDay({
  date,
  meals,
  isToday,
  onAddMeal,
  onClearMeal,
  onViewRecipe,
}: MealDayProps) {
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString("en-US", { month: "short" });

  return (
    <Card className={`relative ${isToday ? "ring-2 ring-blue-500" : ""}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-sm font-medium ${
              isToday ? "text-blue-600" : "text-muted-foreground"
            }`}
          >
            {dayName}
          </span>
          <span className="font-semibold">
            {monthName} {dayNum}
          </span>
        </div>

        <div className="space-y-1.5">
          {MEAL_SLOTS.map((slot) => {
            const meal = meals[slot];
            const totalTime = meal
              ? (meal.recipePrepTime || 0) + (meal.recipeCookTime || 0) || null
              : null;

            return (
              <div key={slot}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {SLOT_LABELS[slot]}
                </div>
                {meal ? (
                  <div className="flex items-start gap-1.5 group">
                    <div
                      className="flex-1 min-w-0 cursor-pointer rounded px-1.5 py-0.5 -mx-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800"
                      onClick={meal.recipeId ? () => onViewRecipe(meal.recipeId!) : undefined}
                    >
                      <p className="text-sm font-medium line-clamp-1">
                        {meal.recipeName || meal.customMeal}
                        {meal.servingsMultiplier && meal.servingsMultiplier !== 1 && (
                          <span className="ml-1 text-xs font-normal text-blue-600">
                            ({meal.servingsMultiplier}x)
                          </span>
                        )}
                      </p>
                      {totalTime && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{totalTime}m</span>
                        </div>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearMeal(slot);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    className="w-full text-left text-xs text-muted-foreground hover:text-foreground py-1 px-1.5 -mx-1.5 rounded border border-dashed border-transparent hover:border-gray-300 dark:hover:border-zinc-600"
                    onClick={() => onAddMeal(slot)}
                  >
                    <Plus className="h-3 w-3 inline mr-0.5" />
                    Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
