"use client";

import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Clock, Users } from "lucide-react";
import { resolveFileUrl } from "@/lib/file-url";

export interface Recipe {
  id: number;
  name: string;
  description: string | null;
  instructions: string | null;
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  category: string | null;
  imageUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
}

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const totalTime =
    (recipe.prepTime || 0) + (recipe.cookTime || 0) || null;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
      onClick={onClick}
    >
      {recipe.imageUrl && (
        <div className="aspect-video relative bg-gray-100 dark:bg-gray-800">
          <Image
            src={resolveFileUrl(recipe.imageUrl) || ""}
            alt={recipe.name}
            className="object-cover"
            fill
            unoptimized
          />
        </div>
      )}
      <CardContent className={recipe.imageUrl ? "pt-3" : "pt-4"}>
        <h3 className="font-semibold text-lg line-clamp-1">{recipe.name}</h3>
        {recipe.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {recipe.description}
          </p>
        )}
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          {totalTime && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{totalTime} min</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{recipe.servings}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
