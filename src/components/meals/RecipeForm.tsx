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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical, SeparatorHorizontal } from "lucide-react";
import { Recipe } from "./RecipeCard";
import {
  UNITS,
  IngredientUnit,
  UNIT_LABELS,
  parseQuantityString,
} from "@/lib/ingredients";

interface Ingredient {
  name: string;
  amount: string;
  unit: IngredientUnit | "";
  section: string;
  // Legacy field for old recipes
  legacyQuantity?: string;
}

interface RecipeFormProps {
  recipe?: Recipe & {
    ingredients?: {
      name: string;
      quantity: string | null;
      amount: number | null;
      unit: string | null;
      section: string | null;
    }[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RecipeForm({
  recipe,
  open,
  onOpenChange,
  onSuccess,
}: RecipeFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: "", amount: "", unit: "", section: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setDescription(recipe.description || "");
      setInstructions(recipe.instructions || "");
      setPrepTime(recipe.prepTime?.toString() || "");
      setCookTime(recipe.cookTime?.toString() || "");
      setServings(recipe.servings?.toString() || "");
      setImageUrl(recipe.imageUrl || "");
      setIngredients(
        recipe.ingredients?.map((i) => {
          // If structured data exists, use it
          if (i.amount != null && i.unit) {
            return {
              name: i.name,
              amount: i.amount.toString(),
              unit: i.unit as IngredientUnit,
              section: i.section || "",
            };
          }
          // Try parsing legacy quantity
          if (i.quantity) {
            const parsed = parseQuantityString(i.quantity);
            if (parsed) {
              return {
                name: i.name,
                amount: parsed.amount.toString(),
                unit: parsed.unit,
                section: i.section || "",
              };
            }
          }
          // Unparseable legacy — keep as-is
          return {
            name: i.name,
            amount: "",
            unit: "" as const,
            section: i.section || "",
            legacyQuantity: i.quantity || "",
          };
        }) || [{ name: "", amount: "", unit: "", section: "" }]
      );
    } else {
      setName("");
      setDescription("");
      setInstructions("");
      setPrepTime("");
      setCookTime("");
      setServings("");
      setImageUrl("");
      setIngredients([{ name: "", amount: "", unit: "", section: "" }]);
    }
  }, [recipe, open]);

  const handleAddIngredient = (afterIndex?: number) => {
    const newIng: Ingredient = {
      name: "",
      amount: "",
      unit: "",
      section:
        afterIndex != null ? ingredients[afterIndex]?.section || "" : "",
    };
    if (afterIndex != null) {
      const updated = [...ingredients];
      updated.splice(afterIndex + 1, 0, newIng);
      setIngredients(updated);
    } else {
      setIngredients([...ingredients, newIng]);
    }
  };

  const handleAddSection = () => {
    const sectionName = prompt("Section name (e.g. For the sauce):");
    if (!sectionName?.trim()) return;

    setIngredients([
      ...ingredients,
      { name: "", amount: "", unit: "", section: sectionName.trim() },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (
    index: number,
    field: keyof Ingredient,
    value: string
  ) => {
    const updated = [...ingredients];
    (updated[index] as Record<string, string>)[field] = value;
    setIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        prepTime: prepTime ? parseInt(prepTime) : null,
        cookTime: cookTime ? parseInt(cookTime) : null,
        servings: servings ? parseInt(servings) : null,
        imageUrl: imageUrl.trim() || null,
        ingredients: ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            amount: i.amount ? parseFloat(i.amount) : null,
            unit: i.unit || null,
            section: i.section || null,
            // Pass legacy quantity if no structured data
            quantity:
              !i.amount && !i.unit ? i.legacyQuantity || null : null,
          })),
      };

      const url = recipe ? `/api/recipes/${recipe.id}` : "/api/recipes";
      const method = recipe ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      console.error("Error saving recipe:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get unique sections for rendering headers
  const renderIngredients = () => {
    let currentSection = "";

    return ingredients.map((ing, index) => {
      const showSectionHeader =
        ing.section && ing.section !== currentSection;
      if (ing.section) currentSection = ing.section;

      return (
        <div key={index}>
          {showSectionHeader && (
            <div className="flex items-center gap-2 mt-3 mb-1">
              <Input
                value={ing.section}
                onChange={(e) =>
                  handleSectionRename(ing.section, e.target.value)
                }
                className="font-semibold text-sm bg-gray-50 border-dashed"
                placeholder="Section name"
              />
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {ing.legacyQuantity !== undefined && !ing.amount && !ing.unit ? (
              // Legacy freetext fallback
              <Input
                value={ing.legacyQuantity}
                onChange={(e) =>
                  handleIngredientChange(
                    index,
                    "legacyQuantity" as keyof Ingredient,
                    e.target.value
                  )
                }
                placeholder="Qty"
                className="w-24"
              />
            ) : (
              <>
                <Input
                  type="number"
                  step="any"
                  value={ing.amount}
                  onChange={(e) =>
                    handleIngredientChange(index, "amount", e.target.value)
                  }
                  placeholder="Amt"
                  className="w-[72px]"
                />
                <Select
                  value={ing.unit || undefined}
                  onValueChange={(val) =>
                    handleIngredientChange(index, "unit", val)
                  }
                >
                  <SelectTrigger className="w-[88px]">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {UNIT_LABELS[u]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            <Input
              value={ing.name}
              onChange={(e) =>
                handleIngredientChange(index, "name", e.target.value)
              }
              placeholder="Ingredient name"
              className="flex-1"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => handleRemoveIngredient(index)}
              disabled={ingredients.length === 1}
              className="text-red-500 hover:text-red-700 flex-shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    });
  };

  const handleSectionRename = (oldName: string, newName: string) => {
    setIngredients(
      ingredients.map((ing) =>
        ing.section === oldName ? { ...ing, section: newName } : ing
      )
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe ? "Edit Recipe" : "New Recipe"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Recipe Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Spaghetti Bolognese"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of the dish..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prepTime">Prep Time (min)</Label>
              <Input
                id="prepTime"
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cookTime">Cook Time (min)</Label>
              <Input
                id="cookTime"
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="4"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Ingredients</Label>
            <div className="space-y-2">{renderIngredients()}</div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddIngredient()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Ingredient
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSection}
              >
                <SeparatorHorizontal className="h-4 w-4 mr-1" />
                Add Section
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Step-by-step cooking instructions..."
              rows={6}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting
                ? "Saving..."
                : recipe
                  ? "Update Recipe"
                  : "Create Recipe"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
