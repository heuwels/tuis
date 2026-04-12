"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Check } from "lucide-react";

interface Ingredient {
  name: string;
  quantity?: string | null;
  amount?: number | null;
  unit?: string | null;
  displayQuantity?: string;
}

interface ShoppingList {
  id: number;
  name: string;
  color: string | null;
}

interface MissingIngredientsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startDate: string;
  endDate: string;
}

export function MissingIngredients({
  open,
  onOpenChange,
  startDate,
  endDate,
}: MissingIngredientsProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [onList, setOnList] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setAddedCount(0);
      Promise.all([fetchIngredients(), fetchLists()]).finally(() =>
        setIsLoading(false)
      );
    }
  }, [open, startDate, endDate]);

  const fetchIngredients = async () => {
    try {
      const response = await fetch(
        `/api/meals/ingredients?start=${startDate}&end=${endDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setIngredients(data.ingredients || []);
        setOnList(data.onList || []);
        // Pre-select items not already on list
        const notOnList = (data.ingredients || [])
          .filter((i: Ingredient) => !data.onList.includes(i.name.toLowerCase()))
          .map((i: Ingredient) => i.name.toLowerCase());
        setSelected(new Set(notOnList));
      }
    } catch (error) {
      console.error("Error fetching ingredients:", error);
    }
  };

  const fetchLists = async () => {
    try {
      const response = await fetch("/api/shopping/lists");
      if (response.ok) {
        const data = await response.json();
        setLists(data);
        if (data.length > 0) {
          setSelectedListId(data[0].id.toString());
        }
      }
    } catch (error) {
      console.error("Error fetching lists:", error);
    }
  };

  const toggleIngredient = (name: string) => {
    const key = name.toLowerCase();
    const newSelected = new Set(selected);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelected(newSelected);
  };

  const handleAddToList = async () => {
    if (!selectedListId || selected.size === 0) return;

    setIsAdding(true);
    let count = 0;

    try {
      for (const ingredient of ingredients) {
        if (selected.has(ingredient.name.toLowerCase())) {
          await fetch("/api/shopping/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              listId: parseInt(selectedListId),
              name: ingredient.name,
              quantity: ingredient.displayQuantity || ingredient.quantity,
            }),
          });
          count++;
        }
      }
      setAddedCount(count);
      // Refresh to update "on list" status
      await fetchIngredients();
    } catch (error) {
      console.error("Error adding items:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const selectAll = () => {
    const all = ingredients
      .filter((i) => !onList.includes(i.name.toLowerCase()))
      .map((i) => i.name.toLowerCase());
    setSelected(new Set(all));
  };

  const selectNone = () => {
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Add Ingredients to Shopping List
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">
            Loading ingredients...
          </p>
        ) : ingredients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No recipes planned for this week yet.
          </p>
        ) : (
          <>
            {addedCount > 0 && (
              <div className="bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg flex items-center gap-2">
                <Check className="h-4 w-4" />
                Added {addedCount} item{addedCount !== 1 ? "s" : ""} to your
                list!
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  Select None
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                {selected.size} selected
              </span>
            </div>

            <div className="overflow-y-auto flex-1 -mx-6 px-6 space-y-1">
              {ingredients.map((ing) => {
                const isOnList = onList.includes(ing.name.toLowerCase());
                const isSelected = selected.has(ing.name.toLowerCase());

                return (
                  <div
                    key={ing.name}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      isOnList ? "bg-gray-50 dark:bg-zinc-900 opacity-60" : "hover:bg-gray-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleIngredient(ing.name)}
                      disabled={isOnList}
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className={isOnList ? "text-muted-foreground" : ""}
                      >
                        {(ing.displayQuantity || ing.quantity) && (
                          <span className="font-medium text-blue-600 mr-2">
                            {ing.displayQuantity || ing.quantity}
                          </span>
                        )}
                        {ing.name}
                      </span>
                    </div>
                    {isOnList && (
                      <span className="text-xs text-muted-foreground">
                        Already on list
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <Select
                value={selectedListId}
                onValueChange={setSelectedListId}
                disabled={lists.length === 0}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select list" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: list.color || "#3b82f6" }}
                        />
                        {list.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleAddToList}
                disabled={
                  isAdding || selected.size === 0 || lists.length === 0
                }
                className="flex-1"
              >
                {isAdding
                  ? "Adding..."
                  : `Add ${selected.size} Item${selected.size !== 1 ? "s" : ""}`}
              </Button>
            </div>

            {lists.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Create a shopping list first to add ingredients.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
