"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  Users,
  Pencil,
  Trash2,
  CalendarPlus,
  Copy,
  Printer,
  Check,
} from "lucide-react";
import { Recipe } from "./RecipeCard";
import {
  IngredientUnit,
  scaleAmount,
  formatIngredient,
  formatRecipeAsText,
} from "@/lib/ingredients";

interface RecipeIngredient {
  id: number;
  recipeId: number;
  name: string;
  quantity: string | null;
  amount: number | null;
  unit: string | null;
  section: string | null;
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

const SCALE_OPTIONS = [0.25, 0.5, 1, 1.25, 1.5, 2];

export function RecipeDetail({
  recipe,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onAddToPlan,
}: RecipeDetailProps) {
  const [multiplier, setMultiplier] = useState(1);
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!recipe) return null;

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0) || null;

  const scaledServings = recipe.servings
    ? recipe.servings * multiplier
    : null;

  const renderIngredientQuantity = (ing: RecipeIngredient) => {
    if (ing.amount != null && ing.unit) {
      const scaled = scaleAmount(
        ing.amount,
        ing.unit as IngredientUnit,
        multiplier
      );
      return formatIngredient(scaled.amount, scaled.unit);
    }
    // Legacy: show raw quantity, no scaling
    return ing.quantity || "";
  };

  // Group ingredients by section
  const groupedIngredients = () => {
    if (!recipe.ingredients) return [];

    const groups: { section: string | null; items: RecipeIngredient[] }[] =
      [];
    let currentSection: string | null = null;
    let currentGroup: RecipeIngredient[] = [];

    for (const ing of recipe.ingredients) {
      if (ing.section !== currentSection) {
        if (currentGroup.length > 0) {
          groups.push({ section: currentSection, items: currentGroup });
        }
        currentSection = ing.section;
        currentGroup = [ing];
      } else {
        currentGroup.push(ing);
      }
    }

    if (currentGroup.length > 0) {
      groups.push({ section: currentSection, items: currentGroup });
    }

    return groups;
  };

  const handleCopy = async () => {
    const text = formatRecipeAsText(
      {
        name: recipe.name,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        description: recipe.description,
        ingredients:
          recipe.ingredients?.map((i) => ({
            name: i.name,
            amount: i.amount,
            unit: i.unit as IngredientUnit | null,
            quantity: i.quantity,
            section: i.section,
          })) || [],
        instructions: recipe.instructions,
      },
      multiplier
    );

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const text = formatRecipeAsText(
      {
        name: recipe.name,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        description: recipe.description,
        ingredients:
          recipe.ingredients?.map((i) => ({
            name: i.name,
            amount: i.amount,
            unit: i.unit as IngredientUnit | null,
            quantity: i.quantity,
            section: i.section,
          })) || [],
        instructions: recipe.instructions,
      },
      multiplier
    );

    // Build a clean HTML document for printing
    const groups = groupedIngredients();

    let ingredientHtml = "";
    for (const group of groups) {
      if (group.section) {
        ingredientHtml += `<h3 style="margin: 12px 0 4px; font-size: 14px; font-weight: 600;">${group.section}</h3>`;
      }
      ingredientHtml += "<ul style='margin: 0; padding-left: 20px;'>";
      for (const ing of group.items) {
        const qty = renderIngredientQuantity(ing);
        ingredientHtml += `<li style="margin: 2px 0;">${qty ? `<strong>${qty}</strong> ` : ""}${ing.name}</li>`;
      }
      ingredientHtml += "</ul>";
    }

    const instructionsHtml = recipe.instructions
      ? recipe.instructions
          .split("\n")
          .filter((l) => l.trim())
          .map((step, i) => `<p style="margin: 4px 0;">${i + 1}. ${step.trim()}</p>`)
          .join("")
      : "";

    const meta = [];
    if (recipe.prepTime) meta.push(`Prep: ${recipe.prepTime} min`);
    if (recipe.cookTime) meta.push(`Cook: ${recipe.cookTime} min`);
    if (totalTime) meta.push(`Total: ${totalTime} min`);
    if (scaledServings)
      meta.push(
        `Servings: ${Number.isInteger(scaledServings) ? scaledServings : scaledServings.toFixed(1)}`
      );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${recipe.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; }
          h1 { margin-bottom: 8px; }
          .meta { color: #666; margin-bottom: 16px; }
          h2 { font-size: 16px; margin-top: 24px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        </style>
      </head>
      <body>
        <h1>${recipe.name}</h1>
        ${meta.length > 0 ? `<p class="meta">${meta.join(" | ")}</p>` : ""}
        ${recipe.description ? `<p>${recipe.description}</p>` : ""}
        <h2>Ingredients</h2>
        ${ingredientHtml}
        ${recipe.instructions ? `<h2>Instructions</h2>${instructionsHtml}` : ""}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

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
          {scaledServings != null && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>
                {Number.isInteger(scaledServings)
                  ? scaledServings
                  : scaledServings.toFixed(1)}{" "}
                servings
              </span>
            </div>
          )}
        </div>

        {recipe.description && (
          <p className="text-muted-foreground">{recipe.description}</p>
        )}

        {/* Scale multiplier */}
        {recipe.ingredients && recipe.ingredients.some((i) => i.amount != null) && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Scale:</span>
            <div className="flex gap-1">
              {SCALE_OPTIONS.map((scale) => (
                <Button
                  key={scale}
                  size="sm"
                  variant={multiplier === scale ? "default" : "outline"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setMultiplier(scale)}
                >
                  {scale}x
                </Button>
              ))}
            </div>
          </div>
        )}

        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Ingredients</h3>
            {groupedIngredients().map((group, gi) => (
              <div key={gi}>
                {group.section && (
                  <h4 className="text-sm font-medium text-muted-foreground mt-3 mb-1 italic">
                    {group.section}
                  </h4>
                )}
                <ul className="space-y-1">
                  {group.items.map((ing) => {
                    const qty = renderIngredientQuantity(ing);
                    return (
                      <li key={ing.id} className="flex gap-2">
                        {qty && (
                          <span className="font-medium text-blue-600 min-w-[80px]">
                            {qty}
                          </span>
                        )}
                        <span>{ing.name}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
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

        {/* Copy & Print buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 mr-1" />
            ) : (
              <Copy className="h-4 w-4 mr-1" />
            )}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>

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
