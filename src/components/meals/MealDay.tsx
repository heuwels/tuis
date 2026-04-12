"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Plus, X } from "lucide-react";

interface MealEntry {
  id: number;
  date: string;
  recipeId: number | null;
  servingsMultiplier?: number | null;
  customMeal: string | null;
  notes: string | null;
  recipeName?: string | null;
  recipePrepTime?: number | null;
  recipeCookTime?: number | null;
  recipeImageUrl?: string | null;
}

interface MealDayProps {
  date: Date;
  meal: MealEntry | null;
  isToday: boolean;
  onAddMeal: () => void;
  onClearMeal: () => void;
  onViewRecipe?: () => void;
}

export function MealDay({
  date,
  meal,
  isToday,
  onAddMeal,
  onClearMeal,
  onViewRecipe,
}: MealDayProps) {
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString("en-US", { month: "short" });

  const totalTime = meal
    ? (meal.recipePrepTime || 0) + (meal.recipeCookTime || 0) || null
    : null;

  return (
    <Card
      className={`relative ${isToday ? "ring-2 ring-blue-500" : ""}`}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
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
          {meal && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onClearMeal();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {meal ? (
          <div
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 rounded p-2 -mx-2"
            onClick={meal.recipeId ? onViewRecipe : undefined}
          >
            {meal.recipeImageUrl && (
              <div className="aspect-video relative bg-gray-100 dark:bg-gray-800 rounded overflow-hidden mb-2">
                <img
                  src={meal.recipeImageUrl}
                  alt={meal.recipeName || ""}
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <p className="font-medium line-clamp-2">
              {meal.recipeName || meal.customMeal}
              {meal.servingsMultiplier && meal.servingsMultiplier !== 1 && (
                <span className="ml-1 text-xs font-normal text-blue-600">
                  ({meal.servingsMultiplier}x)
                </span>
              )}
            </p>
            {totalTime && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                <span>{totalTime} min</span>
              </div>
            )}
            {meal.notes && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {meal.notes}
              </p>
            )}
          </div>
        ) : (
          <Button
            variant="ghost"
            className="w-full h-20 border-2 border-dashed text-muted-foreground hover:text-foreground hover:border-solid"
            onClick={onAddMeal}
          >
            <Plus className="h-5 w-5 mr-1" />
            Add Meal
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
