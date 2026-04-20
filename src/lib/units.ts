// Unit system types and conversion utilities
// Data is always stored in metric internally; imperial is display-only.

export type UnitSystem = "metric" | "imperial";

// --- Conversion factors (metric -> imperial) ---

const KM_TO_MILES = 0.621371;
const LITRES_TO_GALLONS = 0.264172;
const KG_TO_POUNDS = 2.20462;
const G_TO_OUNCES = 0.035274;
const ML_TO_FL_OZ = 0.033814;
const CELSIUS_TO_FAHRENHEIT = (c: number) => c * 9 / 5 + 32;
const FAHRENHEIT_TO_CELSIUS = (f: number) => (f - 32) * 5 / 9;

// --- Conversion functions ---

export function kmToMiles(km: number): number {
  return km * KM_TO_MILES;
}

export function milesToKm(miles: number): number {
  return miles / KM_TO_MILES;
}

export function litresToGallons(litres: number): number {
  return litres * LITRES_TO_GALLONS;
}

export function gallonsToLitres(gallons: number): number {
  return gallons / LITRES_TO_GALLONS;
}

export function kgToPounds(kg: number): number {
  return kg * KG_TO_POUNDS;
}

export function poundsToKg(pounds: number): number {
  return pounds / KG_TO_POUNDS;
}

export function gramsToOunces(grams: number): number {
  return grams * G_TO_OUNCES;
}

export function ouncesToGrams(ounces: number): number {
  return ounces / G_TO_OUNCES;
}

export function mlToFlOz(ml: number): number {
  return ml * ML_TO_FL_OZ;
}

export function flOzToMl(flOz: number): number {
  return flOz / ML_TO_FL_OZ;
}

export function celsiusToFahrenheit(c: number): number {
  return CELSIUS_TO_FAHRENHEIT(c);
}

export function fahrenheitToCelsius(f: number): number {
  return FAHRENHEIT_TO_CELSIUS(f);
}

// --- Unit label maps ---

export interface UnitLabels {
  km: string;
  litres: string;
  litresShort: string;
  gallonsShort: string;
  perLitre: string;
  per100km: string;
  kg: string;
  g: string;
  mL: string;
  L: string;
  celsius: string;
}

const METRIC_LABELS: UnitLabels = {
  km: "km",
  litres: "litres",
  litresShort: "L",
  gallonsShort: "gal",
  perLitre: "/L",
  per100km: "L/100km",
  kg: "kg",
  g: "g",
  mL: "mL",
  L: "L",
  celsius: "\u00B0C",
};

const IMPERIAL_LABELS: UnitLabels = {
  km: "mi",
  litres: "gallons",
  litresShort: "gal",
  gallonsShort: "gal",
  perLitre: "/gal",
  per100km: "MPG",
  kg: "lb",
  g: "oz",
  mL: "fl oz",
  L: "gal",
  celsius: "\u00B0F",
};

export function getUnitLabels(system: UnitSystem): UnitLabels {
  return system === "imperial" ? IMPERIAL_LABELS : METRIC_LABELS;
}

// --- Display formatters ---

/** Format a distance value for display */
export function formatDistance(km: number, system: UnitSystem): string {
  if (system === "imperial") {
    return `${kmToMiles(km).toLocaleString(undefined, { maximumFractionDigits: 0 })} mi`;
  }
  return `${km.toLocaleString()} km`;
}

/** Format a volume value (litres stored internally) for display */
export function formatVolume(litres: number, system: UnitSystem): string {
  if (system === "imperial") {
    return `${litresToGallons(litres).toFixed(2)} gal`;
  }
  return `${litres.toFixed(2)} L`;
}

/** Format cost per litre for display */
export function formatCostPerVolume(
  costPerLitre: number,
  system: UnitSystem
): string {
  if (system === "imperial") {
    // Convert $/L to $/gal: multiply by litres-per-gallon
    const costPerGallon = costPerLitre / LITRES_TO_GALLONS;
    return `$${costPerGallon.toFixed(3)}/gal`;
  }
  return `$${costPerLitre.toFixed(3)}/L`;
}

/** Format fuel economy for display.
 *  Metric: L/100km (lower is better)
 *  Imperial: MPG (higher is better) */
export function formatFuelEconomy(
  lPer100km: number,
  system: UnitSystem
): string {
  if (system === "imperial") {
    // L/100km -> MPG: 235.215 / L_per_100km
    const mpg = lPer100km > 0 ? 235.215 / lPer100km : 0;
    return `${mpg.toFixed(1)} MPG`;
  }
  return `${lPer100km.toFixed(1)} L/100km`;
}

/** Format cost per distance for display */
export function formatCostPerDistance(
  costPerKm: number,
  system: UnitSystem
): string {
  if (system === "imperial") {
    const costPerMile = costPerKm / KM_TO_MILES;
    return `$${costPerMile.toFixed(2)}/mi`;
  }
  return `$${costPerKm.toFixed(2)}/km`;
}

/** Format a weight in grams for display */
export function formatWeightG(grams: number, system: UnitSystem): string {
  if (system === "imperial") {
    const oz = gramsToOunces(grams);
    if (oz >= 16) {
      const lb = oz / 16;
      return `${lb.toFixed(1)} lb`;
    }
    return `${oz.toFixed(1)} oz`;
  }
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)} kg`;
  }
  return `${grams.toFixed(0)} g`;
}

/** Format a weight in kg for display */
export function formatWeightKg(kg: number, system: UnitSystem): string {
  if (system === "imperial") {
    return `${kgToPounds(kg).toFixed(1)} lb`;
  }
  return `${kg.toFixed(1)} kg`;
}

/** Format a volume in mL for display */
export function formatVolumeMl(ml: number, system: UnitSystem): string {
  if (system === "imperial") {
    const flOz = mlToFlOz(ml);
    if (flOz >= 128) {
      return `${(flOz / 128).toFixed(2)} gal`;
    }
    if (flOz >= 8) {
      return `${(flOz / 8).toFixed(1)} cups`;
    }
    return `${flOz.toFixed(1)} fl oz`;
  }
  if (ml >= 1000) {
    return `${(ml / 1000).toFixed(2)} L`;
  }
  return `${ml.toFixed(0)} mL`;
}

/** Format temperature for display */
export function formatTemperature(
  celsius: number,
  system: UnitSystem
): string {
  if (system === "imperial") {
    return `${celsiusToFahrenheit(celsius).toFixed(0)}\u00B0F`;
  }
  return `${celsius.toFixed(0)}\u00B0C`;
}

// --- Unit categories for reference ---

export const UNIT_CATEGORIES = {
  distance: {
    metric: ["km", "m"],
    imperial: ["mi", "ft", "yd"],
  },
  weight: {
    metric: ["g", "kg"],
    imperial: ["oz", "lb"],
  },
  volume: {
    metric: ["mL", "L"],
    imperial: ["fl oz", "cup", "pt", "qt", "gal"],
  },
  temperature: {
    metric: ["\u00B0C"],
    imperial: ["\u00B0F"],
  },
} as const;

// Default unit system
export const DEFAULT_UNIT_SYSTEM: UnitSystem = "metric";
