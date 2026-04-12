"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, ChefHat, Clock, Users, ArrowLeft } from "lucide-react";
import { Recipe } from "./RecipeCard";

const SCALE_OPTIONS = [0.5, 1, 1.5, 2];

interface RecipePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectRecipe: (recipeId: number, servingsMultiplier: number) => void;
  onSelectCustom: (meal: string, notes?: string) => void;
  selectedDate: Date | null;
}

export function RecipePicker({
  open,
  onOpenChange,
  onSelectRecipe,
  onSelectCustom,
  selectedDate,
}: RecipePickerProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"recipe" | "custom" | "confirm">("recipe");
  const [customMeal, setCustomMeal] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [selectedRecipeForConfirm, setSelectedRecipeForConfirm] =
    useState<Recipe | null>(null);
  const [multiplier, setMultiplier] = useState(1);

  const fetchRecipes = async (query?: string) => {
    try {
      const url = query
        ? `/api/recipes?q=${encodeURIComponent(query)}`
        : "/api/recipes";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRecipes(data);
      }
    } catch (error) {
      console.error("Error fetching recipes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      fetchRecipes();
      setMode("recipe");
      setCustomMeal("");
      setCustomNotes("");
      setSearchQuery("");
      setSelectedRecipeForConfirm(null);
      setMultiplier(1);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const debounce = setTimeout(() => {
      fetchRecipes(searchQuery);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, open]);

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipeForConfirm(recipe);
    setMultiplier(1);
    setMode("confirm");
  };

  const handleConfirm = () => {
    if (selectedRecipeForConfirm) {
      onSelectRecipe(selectedRecipeForConfirm.id, multiplier);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customMeal.trim()) {
      onSelectCustom(customMeal.trim(), customNotes.trim() || undefined);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {selectedDate
              ? `Add Meal for ${formatDate(selectedDate)}`
              : "Add Meal"}
          </DialogTitle>
        </DialogHeader>

        {mode !== "confirm" && (
          <div className="flex gap-2 border-b pb-4">
            <Button
              variant={mode === "recipe" ? "default" : "outline"}
              onClick={() => setMode("recipe")}
            >
              Choose Recipe
            </Button>
            <Button
              variant={mode === "custom" ? "default" : "outline"}
              onClick={() => setMode("custom")}
            >
              Quick Entry
            </Button>
          </div>
        )}

        {mode === "confirm" && selectedRecipeForConfirm ? (
          <div className="space-y-4">
            <button
              onClick={() => setMode("recipe")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to recipes
            </button>

            <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 dark:bg-zinc-900">
              {selectedRecipeForConfirm.imageUrl ? (
                <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                  <img
                    src={selectedRecipeForConfirm.imageUrl}
                    alt={selectedRecipeForConfirm.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <ChefHat className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <h4 className="font-medium">
                  {selectedRecipeForConfirm.name}
                </h4>
                {selectedRecipeForConfirm.servings && (
                  <p className="text-sm text-muted-foreground">
                    {Math.round(
                      selectedRecipeForConfirm.servings * multiplier * 10
                    ) / 10}{" "}
                    servings
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Scale</Label>
              <div className="flex gap-2">
                {SCALE_OPTIONS.map((scale) => (
                  <Button
                    key={scale}
                    size="sm"
                    variant={multiplier === scale ? "default" : "outline"}
                    onClick={() => setMultiplier(scale)}
                  >
                    {scale}x
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleConfirm}>
                Add to Plan{multiplier !== 1 ? ` (${multiplier}x)` : ""}
              </Button>
            </div>
          </div>
        ) : mode === "recipe" ? (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="overflow-y-auto flex-1 -mx-6 px-6">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">
                  Loading recipes...
                </p>
              ) : recipes.length === 0 ? (
                <div className="text-center py-8">
                  <ChefHat className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "No recipes found. Try a different search."
                      : "No recipes yet. Create some in the Recipe Library!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recipes.map((recipe) => {
                    const totalTime =
                      (recipe.prepTime || 0) + (recipe.cookTime || 0) || null;
                    return (
                      <div
                        key={recipe.id}
                        className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                        onClick={() => handleRecipeClick(recipe)}
                      >
                        {recipe.imageUrl ? (
                          <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                            <img
                              src={recipe.imageUrl}
                              alt={recipe.name}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <ChefHat className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{recipe.name}</h4>
                          {recipe.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {recipe.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {totalTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {totalTime} min
                              </span>
                            )}
                            {recipe.servings && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {recipe.servings}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customMeal">What&apos;s for dinner?</Label>
              <Input
                id="customMeal"
                value={customMeal}
                onChange={(e) => setCustomMeal(e.target.value)}
                placeholder="e.g., Takeout pizza, Leftovers, Eating out"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customNotes">Notes (optional)</Label>
              <Textarea
                id="customNotes"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!customMeal.trim()}>
                Add to Plan
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
