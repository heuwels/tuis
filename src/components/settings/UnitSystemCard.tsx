"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ruler } from "lucide-react";
import type { UnitSystem } from "@/lib/units";

export function UnitSystemCard() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.unitSystem === "metric" || data.unitSystem === "imperial") {
          setUnitSystem(data.unitSystem);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggle = async (system: UnitSystem) => {
    if (system === unitSystem) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "unitSystem", value: system }),
      });
      if (response.ok) {
        setUnitSystem(system);
      }
    } catch (error) {
      console.error("Error saving unit system:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-5 w-5" />
          Unit System
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">Loading...</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choose your preferred unit system for distances, volumes, and
              weights. Data is stored in metric and converted for display.
            </p>
            <div className="flex gap-2">
              <Button
                variant={unitSystem === "metric" ? "default" : "outline"}
                onClick={() => handleToggle("metric")}
                disabled={isSaving}
                className="flex-1"
                data-testid="unit-metric"
              >
                Metric
                <span className="ml-2 text-xs opacity-70">km, L, kg</span>
              </Button>
              <Button
                variant={unitSystem === "imperial" ? "default" : "outline"}
                onClick={() => handleToggle("imperial")}
                disabled={isSaving}
                className="flex-1"
                data-testid="unit-imperial"
              >
                Imperial
                <span className="ml-2 text-xs opacity-70">mi, gal, lb</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
