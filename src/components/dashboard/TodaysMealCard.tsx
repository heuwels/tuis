"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, Clock, ChefHat } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface MealEntry {
  id: number;
  date: string;
  recipeId: number | null;
  servingsMultiplier: number | null;
  customMeal: string | null;
  notes: string | null;
  recipeName: string | null;
  recipePrepTime: number | null;
  recipeCookTime: number | null;
}

export function TodaysMealCard() {
  const [meal, setMeal] = useState<MealEntry | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    fetch(`/api/meals?start=${today}&end=${today}`)
      .then((r) => r.ok ? r.json() : [])
      .then((meals: MealEntry[]) => {
        setMeal(meals.length > 0 ? meals[0] : null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  const mealName = meal?.recipeName || meal?.customMeal;
  const totalTime = meal?.recipePrepTime && meal?.recipeCookTime
    ? meal.recipePrepTime + meal.recipeCookTime
    : null;

  return (
    <Link href="/meals" className="block group">
      <Card className="h-full transition-colors group-hover:border-orange-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Tonight&apos;s Meal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mealName ? (
            <div className="space-y-1">
              <p className="text-lg font-semibold leading-tight">{mealName}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {totalTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {totalTime}m
                  </span>
                )}
                {meal?.servingsMultiplier && meal.servingsMultiplier !== 1 && (
                  <span className="flex items-center gap-1">
                    <ChefHat className="h-3.5 w-3.5" />
                    {meal.servingsMultiplier}x
                  </span>
                )}
              </div>
              {meal?.notes && (
                <p className="text-xs text-muted-foreground mt-1">{meal.notes}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No meal planned — tap to add one
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
