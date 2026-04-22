export const UNITS = [
  "g",
  "kg",
  "oz",
  "lb",
  "mL",
  "L",
  "fl oz",
  "pint",
  "quart",
  "gallon",
  "cup",
  "tbsp",
  "tsp",
  "whole",
] as const;

export type IngredientUnit = (typeof UNITS)[number];

export type MeasurementSystem = "metric" | "imperial";

export const UNIT_LABELS: Record<IngredientUnit, string> = {
  g: "g",
  kg: "kg",
  oz: "oz",
  lb: "lb",
  mL: "mL",
  L: "L",
  "fl oz": "fl oz",
  pint: "pint",
  quart: "quart",
  gallon: "gallon",
  cup: "cup",
  tbsp: "tbsp",
  tsp: "tsp",
  whole: "whole",
};

export const UNIT_GROUPS: Record<string, IngredientUnit[]> = {
  weight: ["g", "kg", "oz", "lb"],
  volume: ["mL", "L", "fl oz", "pint", "quart", "gallon"],
  cookingVolume: ["tsp", "tbsp", "cup"],
  countable: ["whole"],
};

// Conversion to base unit within each group
// Imperial weight converts through g; imperial volume converts through mL
// so cross-system aggregation works correctly
const TO_BASE: Record<
  IngredientUnit,
  { base: IngredientUnit; factor: number }
> = {
  g: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  oz: { base: "g", factor: 28.3495 },
  lb: { base: "g", factor: 453.592 },
  mL: { base: "mL", factor: 1 },
  L: { base: "mL", factor: 1000 },
  "fl oz": { base: "mL", factor: 29.5735 },
  pint: { base: "mL", factor: 473.176 },
  quart: { base: "mL", factor: 946.353 },
  gallon: { base: "mL", factor: 3785.41 },
  tsp: { base: "tsp", factor: 1 },
  tbsp: { base: "tsp", factor: 3 },
  cup: { base: "tsp", factor: 48 },
  whole: { base: "whole", factor: 1 },
};

/** Get the filtered list of units for a measurement system */
export function getUnitsForSystem(system: MeasurementSystem): IngredientUnit[] {
  if (system === "imperial") {
    return ["oz", "lb", "fl oz", "pint", "quart", "gallon", "cup", "tbsp", "tsp", "whole"];
  }
  // metric (default)
  return ["g", "kg", "mL", "L", "cup", "tbsp", "tsp", "whole"];
}

function getUnitGroup(unit: IngredientUnit): IngredientUnit[] | null {
  for (const group of Object.values(UNIT_GROUPS)) {
    if (group.includes(unit)) return group;
  }
  return null;
}

export function areUnitsCompatible(
  a: IngredientUnit,
  b: IngredientUnit
): boolean {
  if (a === b) return true;
  const groupA = getUnitGroup(a);
  const groupB = getUnitGroup(b);
  return groupA !== null && groupA === groupB;
}

function toBase(amount: number, unit: IngredientUnit): number {
  const entry = TO_BASE[unit];
  if (!entry) return amount;
  return amount * entry.factor;
}

function fromBase(
  baseAmount: number,
  targetUnit: IngredientUnit
): number {
  const entry = TO_BASE[targetUnit];
  if (!entry) return baseAmount;
  return baseAmount / entry.factor;
}

/** Pick the best display unit for a base amount in a given group.
 *  When originalUnit is provided, stays within the same system (metric/imperial). */
function bestUnit(
  baseAmount: number,
  baseUnit: IngredientUnit,
  originalUnit?: IngredientUnit
): { amount: number; unit: IngredientUnit } {
  const isImperialWeight = originalUnit && ["oz", "lb"].includes(originalUnit);
  const isImperialVolume = originalUnit && ["fl oz", "pint", "quart", "gallon"].includes(originalUnit);

  // Weight: g base
  if (baseUnit === "g") {
    if (isImperialWeight) {
      // Stay in imperial
      if (baseAmount >= 453.592) return { amount: baseAmount / 453.592, unit: "lb" };
      return { amount: baseAmount / 28.3495, unit: "oz" };
    }
    if (baseAmount >= 1000) return { amount: baseAmount / 1000, unit: "kg" };
    if (baseAmount < 1 && baseAmount > 0)
      return { amount: baseAmount, unit: "g" };
    return { amount: baseAmount, unit: "g" };
  }

  // Volume: mL base
  if (baseUnit === "mL") {
    if (isImperialVolume) {
      // Stay in imperial
      if (baseAmount >= 3785.41) return { amount: baseAmount / 3785.41, unit: "gallon" };
      if (baseAmount >= 946.353) return { amount: baseAmount / 946.353, unit: "quart" };
      if (baseAmount >= 473.176) return { amount: baseAmount / 473.176, unit: "pint" };
      return { amount: baseAmount / 29.5735, unit: "fl oz" };
    }
    if (baseAmount >= 1000) return { amount: baseAmount / 1000, unit: "L" };
    return { amount: baseAmount, unit: "mL" };
  }

  // Cooking volume: tsp base
  if (baseUnit === "tsp") {
    if (baseAmount >= 48) return { amount: baseAmount / 48, unit: "cup" };
    if (baseAmount >= 3) return { amount: baseAmount / 3, unit: "tbsp" };
    return { amount: baseAmount, unit: "tsp" };
  }

  return { amount: baseAmount, unit: baseUnit };
}

/** Scale an amount and auto-convert to the best display unit */
export function scaleAmount(
  amount: number,
  unit: IngredientUnit,
  multiplier: number
): { amount: number; unit: IngredientUnit } {
  const scaled = amount * multiplier;
  const entry = TO_BASE[unit];
  if (!entry) return { amount: scaled, unit };
  const baseAmount = toBase(scaled, unit);
  return bestUnit(baseAmount, entry.base, unit);
}

// Common fractions for cooking display
const FRACTIONS: [number, string][] = [
  [0.125, "1/8"],
  [0.25, "1/4"],
  [1 / 3, "1/3"],
  [0.375, "3/8"],
  [0.5, "1/2"],
  [0.625, "5/8"],
  [2 / 3, "2/3"],
  [0.75, "3/4"],
  [0.875, "7/8"],
];

const COOKING_UNITS: IngredientUnit[] = ["cup", "tbsp", "tsp"];

function closestFraction(decimal: number): string | null {
  for (const [value, label] of FRACTIONS) {
    if (Math.abs(decimal - value) < 0.04) return label;
  }
  return null;
}

/** Format an amount for display. Cooking units get fractions, metric gets decimals. */
export function formatAmount(
  amount: number,
  unit: IngredientUnit
): string {
  if (amount === 0) return "0";

  if (COOKING_UNITS.includes(unit)) {
    const whole = Math.floor(amount);
    const remainder = amount - whole;

    if (remainder < 0.04) {
      return whole.toString();
    }

    const frac = closestFraction(remainder);
    if (frac) {
      return whole > 0 ? `${whole} ${frac}` : frac;
    }

    // No close fraction match — show decimal
    return roundSmart(amount);
  }

  if (unit === "whole") {
    return Number.isInteger(amount) ? amount.toString() : roundSmart(amount);
  }

  // Metric units: smart decimal
  return roundSmart(amount);
}

function roundSmart(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(1).replace(/\.0$/, "");
  return n.toFixed(2).replace(/\.?0+$/, "");
}

/** Format a full ingredient quantity string like "200g" or "1/2 cup" */
export function formatIngredient(
  amount: number | null,
  unit: IngredientUnit | null,
  legacyQuantity?: string | null
): string {
  if (amount == null || unit == null) {
    return legacyQuantity || "";
  }

  const formatted = formatAmount(amount, unit);

  if (unit === "whole") return formatted;

  // No space for compact metric/imperial abbreviations
  if (["g", "kg", "mL", "L", "oz", "lb"].includes(unit)) {
    return `${formatted}${unit}`;
  }

  return `${formatted} ${unit}`;
}

// --- Aggregation for shopping lists ---

export interface AggregatedIngredient {
  name: string;
  amount: number | null;
  unit: IngredientUnit | null;
  displayQuantity: string;
}

interface RawIngredient {
  name: string;
  amount: number | null;
  unit: IngredientUnit | null;
  quantity: string | null;
}

export function aggregateIngredients(
  items: RawIngredient[]
): AggregatedIngredient[] {
  const groups = new Map<
    string,
    {
      name: string;
      entries: {
        amount: number | null;
        unit: IngredientUnit | null;
        quantity: string | null;
      }[];
    }
  >();

  for (const item of items) {
    const key = item.name.toLowerCase().trim();
    if (!groups.has(key)) {
      groups.set(key, { name: item.name, entries: [] });
    }
    groups.get(key)!.entries.push({
      amount: item.amount,
      unit: item.unit,
      quantity: item.quantity,
    });
  }

  const result: AggregatedIngredient[] = [];

  for (const group of groups.values()) {
    // Split into structured and legacy entries
    const structured = group.entries.filter(
      (e) => e.amount != null && e.unit != null
    ) as { amount: number; unit: IngredientUnit; quantity: string | null }[];
    const legacy = group.entries.filter(
      (e) => e.amount == null || e.unit == null
    );

    // Group structured entries by compatible unit groups and sum
    const unitBuckets = new Map<
      string,
      { baseAmount: number; baseUnit: IngredientUnit; originalUnit: IngredientUnit }
    >();

    for (const entry of structured) {
      const convEntry = TO_BASE[entry.unit];
      if (!convEntry) {
        // Unknown unit — treat as legacy
        legacy.push(entry);
        continue;
      }
      const base = convEntry.base;
      const baseKey = base;

      if (unitBuckets.has(baseKey)) {
        const bucket = unitBuckets.get(baseKey)!;
        bucket.baseAmount += toBase(entry.amount, entry.unit);
      } else {
        unitBuckets.set(baseKey, {
          baseAmount: toBase(entry.amount, entry.unit),
          baseUnit: base,
          originalUnit: entry.unit,
        });
      }
    }

    for (const bucket of unitBuckets.values()) {
      const best = bestUnit(bucket.baseAmount, bucket.baseUnit, bucket.originalUnit);
      result.push({
        name: group.name,
        amount: best.amount,
        unit: best.unit,
        displayQuantity: formatIngredient(best.amount, best.unit),
      });
    }

    // Legacy entries: combine as strings
    if (legacy.length > 0) {
      const quantities = legacy
        .map((e) => e.quantity)
        .filter(Boolean) as string[];
      result.push({
        name: group.name,
        amount: null,
        unit: null,
        displayQuantity:
          quantities.length > 0 ? quantities.join(" + ") : "",
      });
    }
  }

  return result;
}

// --- Legacy quantity parsing ---

const UNIT_ALIASES: Record<string, IngredientUnit> = {
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  ml: "mL",
  milliliter: "mL",
  milliliters: "mL",
  millilitre: "mL",
  millilitres: "mL",
  l: "L",
  liter: "L",
  liters: "L",
  litre: "L",
  litres: "L",
  "fl oz": "fl oz",
  floz: "fl oz",
  pint: "pint",
  pints: "pint",
  pt: "pint",
  quart: "quart",
  quarts: "quart",
  qt: "quart",
  gallon: "gallon",
  gallons: "gallon",
  gal: "gallon",
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
};

const FRACTION_MAP: Record<string, number> = {
  "1/8": 0.125,
  "1/4": 0.25,
  "1/3": 1 / 3,
  "3/8": 0.375,
  "1/2": 0.5,
  "5/8": 0.625,
  "2/3": 2 / 3,
  "3/4": 0.75,
  "7/8": 0.875,
};

export function parseQuantityString(
  qty: string
): { amount: number; unit: IngredientUnit } | null {
  if (!qty) return null;
  const s = qty.trim();

  // Match: optional whole number, optional fraction, optional unit (may contain spaces, e.g. "fl oz")
  // e.g. "2 cups", "1/2 tsp", "1 1/2 cup", "200g", "200 g", "3", "4 fl oz"
  const match = s.match(
    /^(\d+(?:\.\d+)?)?\s*(?:(\d+\/\d+))?\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)?$/
  );

  if (!match) return null;

  const [, wholeStr, fracStr, unitStr] = match;

  let amount = 0;
  if (wholeStr) amount += parseFloat(wholeStr);
  if (fracStr && FRACTION_MAP[fracStr]) amount += FRACTION_MAP[fracStr];

  if (amount === 0) return null;

  if (unitStr) {
    const unit = UNIT_ALIASES[unitStr.toLowerCase()];
    if (unit) return { amount, unit };
    // Unknown unit string — can't parse
    return null;
  }

  // Number with no unit — treat as whole
  return { amount, unit: "whole" };
}

// --- Recipe formatting for copy/print ---

interface RecipeForCopy {
  name: string;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  description?: string | null;
  ingredients: {
    name: string;
    amount: number | null;
    unit: IngredientUnit | null;
    quantity?: string | null;
    section?: string | null;
  }[];
  instructions?: string | null;
}

export function formatRecipeAsText(
  recipe: RecipeForCopy,
  multiplier: number = 1
): string {
  const lines: string[] = [];

  lines.push(`🍳 ${recipe.name}`);
  lines.push("");

  // Metadata line
  const meta: string[] = [];
  if (recipe.prepTime) meta.push(`Prep: ${recipe.prepTime} min`);
  if (recipe.cookTime) meta.push(`Cook: ${recipe.cookTime} min`);
  if (recipe.prepTime && recipe.cookTime) {
    meta.push(`Total: ${recipe.prepTime + recipe.cookTime} min`);
  }
  if (recipe.servings) {
    const scaled = recipe.servings * multiplier;
    meta.push(
      `Servings: ${Number.isInteger(scaled) ? scaled : scaled.toFixed(1)}`
    );
  }
  if (meta.length > 0) {
    lines.push(`⏱ ${meta.join(" | ")}`);
    lines.push("");
  }

  if (recipe.description) {
    lines.push(recipe.description);
    lines.push("");
  }

  // Ingredients
  if (recipe.ingredients.length > 0) {
    lines.push("📝 Ingredients:");

    let currentSection: string | null = null;

    for (const ing of recipe.ingredients) {
      if (ing.section && ing.section !== currentSection) {
        currentSection = ing.section;
        lines.push("");
        lines.push(`${currentSection}:`);
      }

      let qty: string;
      if (ing.amount != null && ing.unit != null) {
        const scaled = scaleAmount(ing.amount, ing.unit, multiplier);
        qty = formatIngredient(scaled.amount, scaled.unit);
      } else {
        qty = ing.quantity || "";
      }

      lines.push(qty ? `• ${qty} ${ing.name}` : `• ${ing.name}`);
    }

    lines.push("");
  }

  // Instructions
  if (recipe.instructions) {
    lines.push("📋 Instructions:");
    const steps = recipe.instructions.split("\n").filter((l) => l.trim());
    steps.forEach((step, i) => {
      lines.push(`${i + 1}. ${step.trim()}`);
    });
  }

  return lines.join("\n");
}
