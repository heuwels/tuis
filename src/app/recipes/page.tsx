"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, ChefHat, Globe } from "lucide-react";
import { RecipeCard, Recipe } from "@/components/meals/RecipeCard";
import { RecipeForm, RecipeImportData } from "@/components/meals/RecipeForm";
import { RecipeDetail } from "@/components/meals/RecipeDetail";
import { ImportRecipeDialog, ImportedRecipeData } from "@/components/meals/ImportRecipeDialog";
import { AppLayout } from "@/components/layout/AppLayout";

interface RecipeWithIngredients extends Recipe {
  ingredients?: { id: number; recipeId: number; name: string; quantity: string | null; amount: number | null; unit: string | null; section: string | null; sortOrder: number }[];
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithIngredients | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<RecipeImportData | undefined>(undefined);

  const fetchRecipes = async (query?: string) => {
    try {
      const url = query ? `/api/recipes?q=${encodeURIComponent(query)}` : "/api/recipes";
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

  const fetchRecipeDetails = async (id: number) => {
    try {
      const response = await fetch(`/api/recipes/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedRecipe(data);
        setIsDetailOpen(true);
      }
    } catch (error) {
      console.error("Error fetching recipe details:", error);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchRecipes(searchQuery);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleEdit = async () => {
    if (selectedRecipe) {
      setEditingRecipe(selectedRecipe);
      setIsDetailOpen(false);
      setIsFormOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecipe) return;
    if (!confirm(`Delete "${selectedRecipe.name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/recipes/${selectedRecipe.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setIsDetailOpen(false);
        setSelectedRecipe(null);
        fetchRecipes(searchQuery);
      }
    } catch (error) {
      console.error("Error deleting recipe:", error);
    }
  };

  const handleImport = (data: ImportedRecipeData) => {
    // Map imported data to the shape RecipeForm expects
    const mapped: RecipeImportData = {
      name: data.name,
      description: data.description,
      instructions: data.instructions,
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      servings: data.servings,
      imageUrl: data.imageUrl,
      ingredients: data.ingredients.map((ing) => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        raw: ing.raw,
      })),
    };
    // Open form in create mode with imported data pre-populated
    setEditingRecipe(null);
    setPendingImport(mapped);
    setIsFormOpen(true);
  };

  const actions = (
    <>
      <Button
        variant="outline"
        onClick={() => setIsImportOpen(true)}
      >
        <Globe className="h-4 w-4 mr-2" />
        Import from URL
      </Button>
      <Button onClick={() => {
        setEditingRecipe(null);
        setPendingImport(undefined);
        setIsFormOpen(true);
      }}>
        <Plus className="h-4 w-4 mr-2" />
        New Recipe
      </Button>
      <Link href="/meals">
        <Button variant="outline">
          View Meal Plan
        </Button>
      </Link>
    </>
  );

  return (
    <AppLayout title="Recipe Library" actions={actions}>
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Loading recipes...</p>
      ) : recipes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "No recipes found matching your search."
                : "No recipes yet. Add your first recipe to get started!"}
            </p>
            {!searchQuery && (
              <Button onClick={() => {
                setEditingRecipe(null);
                setPendingImport(undefined);
                setIsFormOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Recipe
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => fetchRecipeDetails(recipe.id)}
            />
          ))}
        </div>
      )}

      <RecipeForm
        recipe={editingRecipe || undefined}
        importData={pendingImport}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setPendingImport(undefined);
        }}
        onSuccess={() => {
          setPendingImport(undefined);
          fetchRecipes(searchQuery);
        }}
      />

      <RecipeDetail
        recipe={selectedRecipe}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddToPlan={() => {
          // Navigate to meal planner with recipe selected
          window.location.href = `/meals?addRecipe=${selectedRecipe?.id}`;
        }}
      />
      <ImportRecipeDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImport={handleImport}
      />
    </AppLayout>
  );
}
