"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ShoppingCart, BookOpen } from "lucide-react";
import { MealDay } from "@/components/meals/MealDay";
import { RecipePicker } from "@/components/meals/RecipePicker";
import { RecipeDetail } from "@/components/meals/RecipeDetail";
import { MissingIngredients } from "@/components/meals/MissingIngredients";
import { Recipe } from "@/components/meals/RecipeCard";
import { AppLayout } from "@/components/layout/AppLayout";

interface MealEntry {
  id: number;
  date: string;
  recipeId: number | null;
  customMeal: string | null;
  notes: string | null;
  recipeName: string | null;
  recipePrepTime: number | null;
  recipeCookTime: number | null;
  recipeImageUrl: string | null;
}

interface RecipeWithIngredients extends Recipe {
  ingredients?: { id: number; recipeId: number; name: string; quantity: string | null; sortOrder: number }[];
}

function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function MealsContent() {
  const searchParams = useSearchParams();
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [meals, setMeals] = useState<Map<string, MealEntry>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState<RecipeWithIngredients | null>(null);
  const [isRecipeDetailOpen, setIsRecipeDetailOpen] = useState(false);

  const weekDates = getWeekDates(weekStart);
  const startDateKey = formatDateKey(weekDates[0]);
  const endDateKey = formatDateKey(weekDates[6]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fetchMeals = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/meals?start=${startDateKey}&end=${endDateKey}`
      );
      if (response.ok) {
        const data: MealEntry[] = await response.json();
        const mealMap = new Map<string, MealEntry>();
        data.forEach((meal) => {
          mealMap.set(meal.date, meal);
        });
        setMeals(mealMap);
      }
    } catch (error) {
      console.error("Error fetching meals:", error);
    } finally {
      setIsLoading(false);
    }
  }, [startDateKey, endDateKey]);

  useEffect(() => {
    setIsLoading(true);
    fetchMeals();
  }, [fetchMeals]);

  // Handle adding recipe from URL param (coming from recipe library)
  useEffect(() => {
    const addRecipeId = searchParams.get("addRecipe");
    if (addRecipeId) {
      // Open picker with today selected
      setSelectedDate(today);
      setIsPickerOpen(true);
      // Clear the URL param
      window.history.replaceState({}, "", "/meals");
    }
  }, [searchParams]);

  const handlePreviousWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const handleNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const handleThisWeek = () => {
    setWeekStart(getStartOfWeek(new Date()));
  };

  const handleAddMeal = (date: Date) => {
    setSelectedDate(date);
    setIsPickerOpen(true);
  };

  const handleSelectRecipe = async (recipeId: number) => {
    if (!selectedDate) return;

    try {
      const dateKey = formatDateKey(selectedDate);
      await fetch(`/api/meals/${dateKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      setIsPickerOpen(false);
      fetchMeals();
    } catch (error) {
      console.error("Error setting meal:", error);
    }
  };

  const handleSelectCustom = async (meal: string, notes?: string) => {
    if (!selectedDate) return;

    try {
      const dateKey = formatDateKey(selectedDate);
      await fetch(`/api/meals/${dateKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customMeal: meal, notes }),
      });
      setIsPickerOpen(false);
      fetchMeals();
    } catch (error) {
      console.error("Error setting meal:", error);
    }
  };

  const handleClearMeal = async (date: Date) => {
    const dateKey = formatDateKey(date);
    try {
      await fetch(`/api/meals/${dateKey}`, {
        method: "DELETE",
      });
      fetchMeals();
    } catch (error) {
      console.error("Error clearing meal:", error);
    }
  };

  const handleViewRecipe = async (recipeId: number) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}`);
      if (response.ok) {
        const data = await response.json();
        setViewingRecipe(data);
        setIsRecipeDetailOpen(true);
      }
    } catch (error) {
      console.error("Error fetching recipe:", error);
    }
  };

  const weekLabel = `${weekDates[0].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${weekDates[6].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const isCurrentWeek =
    formatDateKey(weekStart) === formatDateKey(getStartOfWeek(new Date()));

  const actions = (
    <>
      <Link href="/recipes">
        <Button variant="outline">
          <BookOpen className="h-4 w-4 mr-2" />
          Recipes
        </Button>
      </Link>
      <Button onClick={() => setIsIngredientsOpen(true)}>
        <ShoppingCart className="h-4 w-4 mr-2" />
        Add to Shopping List
      </Button>
    </>
  );

  return (
    <AppLayout title="Meal Planner" actions={actions}>
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="outline" size="sm" onClick={handleThisWeek}>
              Today
            </Button>
          )}
          <span className="font-medium text-lg ml-2">{weekLabel}</span>
        </div>
      </div>

      {/* Week Grid */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">
          Loading meals...
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {weekDates.map((date) => {
            const dateKey = formatDateKey(date);
            const meal = meals.get(dateKey) || null;
            const isToday = formatDateKey(date) === formatDateKey(today);

            return (
              <MealDay
                key={dateKey}
                date={date}
                meal={meal}
                isToday={isToday}
                onAddMeal={() => handleAddMeal(date)}
                onClearMeal={() => handleClearMeal(date)}
                onViewRecipe={
                  meal?.recipeId
                    ? () => handleViewRecipe(meal.recipeId!)
                    : undefined
                }
              />
            );
          })}
        </div>
      )}

      <RecipePicker
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        onSelectRecipe={handleSelectRecipe}
        onSelectCustom={handleSelectCustom}
        selectedDate={selectedDate}
      />

      <RecipeDetail
        recipe={viewingRecipe}
        open={isRecipeDetailOpen}
        onOpenChange={setIsRecipeDetailOpen}
      />

      <MissingIngredients
        open={isIngredientsOpen}
        onOpenChange={setIsIngredientsOpen}
        startDate={startDateKey}
        endDate={endDateKey}
      />
    </AppLayout>
  );
}

export default function MealsPage() {
  return (
    <Suspense fallback={
      <AppLayout title="Meal Planner">
        <p className="text-center text-muted-foreground py-12">Loading...</p>
      </AppLayout>
    }>
      <MealsContent />
    </Suspense>
  );
}
