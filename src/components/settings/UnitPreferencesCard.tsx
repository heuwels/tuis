"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Ruler } from "lucide-react";
import type { MeasurementSystem } from "@/lib/ingredients";

export function UnitPreferencesCard() {
  const [system, setSystem] = useState<MeasurementSystem>("metric");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/household-settings")
      .then((res) => res.json())
      .then((data) => setSystem(data.measurementSystem))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = async (value: MeasurementSystem) => {
    const previous = system;
    setSystem(value);
    setIsSaving(true);
    try {
      const res = await fetch("/api/household-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ measurementSystem: value }),
      });
      if (!res.ok) {
        setSystem(previous);
      }
    } catch (error) {
      setSystem(previous);
      console.error("Error saving unit preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-5 w-5" />
          Measurement Units
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">Loading...</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choose which units appear when adding recipe ingredients.
            </p>
            <div className="flex flex-col gap-2">
              <Label className="sr-only">Measurement system</Label>
              {(["metric", "imperial"] as const).map((value) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    system === value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="measurementSystem"
                    value={value}
                    checked={system === value}
                    onChange={() => handleChange(value)}
                    disabled={isSaving}
                    className="accent-blue-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-zinc-100">
                      {value === "metric" ? "Metric" : "Imperial"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {value === "metric"
                        ? "grams, kilograms, millilitres, litres"
                        : "ounces, pounds, fluid ounces, pints, quarts, gallons"}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Cooking units (cup, tbsp, tsp) are always available. Existing recipes keep their original units.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
