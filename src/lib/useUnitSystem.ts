"use client";

import { useEffect, useState } from "react";
import type { UnitSystem } from "./units";
import { DEFAULT_UNIT_SYSTEM } from "./units";

/**
 * Hook to fetch the user's preferred unit system from the settings API.
 * Returns the unit system and a loading state.
 */
export function useUnitSystem(): {
  unitSystem: UnitSystem;
  isLoading: boolean;
} {
  const [unitSystem, setUnitSystem] =
    useState<UnitSystem>(DEFAULT_UNIT_SYSTEM);
  const [isLoading, setIsLoading] = useState(true);

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

  return { unitSystem, isLoading };
}
