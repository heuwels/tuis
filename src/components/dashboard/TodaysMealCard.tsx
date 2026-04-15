"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, Clock } from "lucide-react";
import Link from "next/link";

interface MealEntry {
  id: number;
  date: string;
  slot: string;
  recipeId: number | null;
  servingsMultiplier: number | null;
  customMeal: string | null;
  notes: string | null;
  recipeName: string | null;
  recipePrepTime: number | null;
  recipeCookTime: number | null;
}

const SLOT_ORDER = ["side", "main", "dessert"];
const SLOT_LABELS: Record<string, string> = {
  side: "Side",
  main: "Main",
  dessert: "Dessert",
};

export function TodaysMealCard() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    fetch(`/api/meals?start=${today}&end=${today}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: MealEntry[]) => {
        setMeals(data.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  return (
    <Link href="/meals" className="block group">
      <Card className="h-full transition-colors group-hover:border-orange-200 dark:group-hover:border-orange-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Tonight&apos;s Meals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {meals.length > 0 ? (
            <div className="space-y-1.5">
              {meals.map((meal) => {
                const mealName = meal.recipeName || meal.customMeal;
                const totalTime = meal.recipePrepTime && meal.recipeCookTime
                  ? meal.recipePrepTime + meal.recipeCookTime
                  : null;

                return (
                  <div key={meal.id} className="flex items-baseline gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-12 flex-shrink-0">
                      {SLOT_LABELS[meal.slot] || meal.slot}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {mealName}
                        {meal.servingsMultiplier && meal.servingsMultiplier !== 1 && (
                          <span className="ml-1 text-xs font-normal text-blue-600">
                            ({meal.servingsMultiplier}x)
                          </span>
                        )}
                      </p>
                      {totalTime && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {totalTime}m
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No meals planned — tap to add one
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
