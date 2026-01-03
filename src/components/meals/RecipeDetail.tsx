"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Users, Pencil, Trash2, CalendarPlus } from "lucide-react";
import { Recipe } from "./RecipeCard";

interface RecipeIngredient {
  id: number;
  recipeId: number;
  name: string;
  quantity: string | null;
  sortOrder: number;
}

interface RecipeDetailProps {
  recipe: (Recipe & { ingredients?: RecipeIngredient[] }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddToPlan?: () => void;
}

export function RecipeDetail({
  recipe,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onAddToPlan,
}: RecipeDetailProps) {
  if (!recipe) return null;

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0) || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
        </DialogHeader>

        {recipe.imageUrl && (
          <div className="aspect-video relative bg-gray-100 rounded-lg overflow-hidden -mx-6">
            <img
              src={recipe.imageUrl}
              alt={recipe.name}
              className="object-cover w-full h-full"
            />
          </div>
        )}

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          {recipe.prepTime && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Prep: {recipe.prepTime} min</span>
            </div>
          )}
          {recipe.cookTime && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Cook: {recipe.cookTime} min</span>
            </div>
          )}
          {totalTime && (
            <div className="font-medium text-foreground">
              Total: {totalTime} min
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{recipe.servings} servings</span>
            </div>
          )}
        </div>

        {recipe.description && (
          <p className="text-muted-foreground">{recipe.description}</p>
        )}

        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Ingredients</h3>
            <ul className="space-y-1">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="flex gap-2">
                  {ing.quantity && (
                    <span className="font-medium text-blue-600 min-w-[80px]">
                      {ing.quantity}
                    </span>
                  )}
                  <span>{ing.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recipe.instructions && (
          <div>
            <h3 className="font-semibold mb-2">Instructions</h3>
            <div className="prose prose-sm max-w-none">
              {recipe.instructions.split("\n").map((line, i) => (
                <p key={i} className="mb-2">
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
          {onAddToPlan && (
            <Button onClick={onAddToPlan}>
              <CalendarPlus className="h-4 w-4 mr-1" />
              Add to Meal Plan
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
