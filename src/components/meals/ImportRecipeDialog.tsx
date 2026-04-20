"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Loader2, AlertCircle } from "lucide-react";

export interface ImportedRecipeData {
  name: string;
  description: string | null;
  instructions: string | null;
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  imageUrl: string | null;
  ingredients: {
    name: string;
    amount: number | null;
    unit: string | null;
    raw: string;
  }[];
  sourceUrl: string;
}

interface ImportRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ImportedRecipeData) => void;
}

export function ImportRecipeDialog({
  open,
  onOpenChange,
  onImport,
}: ImportRecipeDialogProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to import recipe");
        return;
      }

      onImport(data);
      onOpenChange(false);
      setUrl("");
      setError(null);
    } catch {
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setUrl("");
      setError(null);
      setIsLoading(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Recipe from URL</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleImport} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipe-url">Recipe URL</Label>
            <Input
              id="recipe-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              placeholder="https://www.example.com/recipe/..."
              disabled={isLoading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Paste a link to a recipe page. Works best with sites that use
              structured recipe data (most major recipe sites).
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !url.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
