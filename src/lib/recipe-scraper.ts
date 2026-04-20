/**
 * Recipe scraper: extracts structured recipe data from web pages
 * using Schema.org/Recipe JSON-LD embedded in HTML.
 */

import type { IngredientUnit } from "@/lib/ingredients";

// Local copy of unit aliases to avoid import issues and keep this module self-contained
const UNIT_ALIASES: Record<string, IngredientUnit> = {
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
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
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScrapedIngredient {
  name: string;
  amount: number | null;
  unit: IngredientUnit | null;
  raw: string; // original string for fallback display
}

export interface ScrapedRecipe {
  name: string;
  description: string | null;
  instructions: string | null;
  prepTime: number | null; // minutes
  cookTime: number | null; // minutes
  servings: number | null;
  imageUrl: string | null;
  ingredients: ScrapedIngredient[];
  sourceUrl: string;
}

// ─── ISO 8601 Duration Parser ─────────────────────────────────────────────────

/**
 * Parse ISO 8601 duration to minutes.
 * Examples: "PT30M" -> 30, "PT1H" -> 60, "PT1H30M" -> 90, "PT2H15M" -> 135
 */
export function parseDuration(duration: string | null | undefined): number | null {
  if (!duration || typeof duration !== "string") return null;

  const match = duration.match(/^PT?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return null;

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;

  const total = hours * 60 + minutes + (seconds > 0 ? Math.ceil(seconds / 60) : 0);
  return total > 0 ? total : null;
}

// ─── Ingredient String Parser ─────────────────────────────────────────────────

// Fraction characters to decimal
const UNICODE_FRACTIONS: Record<string, number> = {
  "\u00BC": 0.25, // 1/4
  "\u00BD": 0.5,  // 1/2
  "\u00BE": 0.75, // 3/4
  "\u2153": 1 / 3, // 1/3
  "\u2154": 2 / 3, // 2/3
  "\u2155": 0.2,  // 1/5
  "\u2156": 0.4,  // 2/5
  "\u2157": 0.6,  // 3/5
  "\u2158": 0.8,  // 4/5
  "\u2159": 1 / 6, // 1/6
  "\u215A": 5 / 6, // 5/6
  "\u215B": 0.125, // 1/8
  "\u215C": 0.375, // 3/8
  "\u215D": 0.625, // 5/8
  "\u215E": 0.875, // 7/8
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

// Build unit pattern from UNIT_ALIASES keys
const UNIT_PATTERN = Object.keys(UNIT_ALIASES)
  .sort((a, b) => b.length - a.length) // longest first for greedy match
  .join("|");

/**
 * Parse an ingredient string like "2 cups all-purpose flour" into
 * amount, unit, and name components.
 */
export function parseIngredientString(raw: string): ScrapedIngredient {
  let s = raw.trim();

  // Replace unicode fractions with decimal
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (s.includes(char)) {
      // Check if preceded by a whole number (e.g. "1\u00BD" -> 1.5)
      s = s.replace(new RegExp(`(\\d+)?\\s*${char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"), (_, whole) => {
        const wholeNum = whole ? parseInt(whole, 10) : 0;
        return String(wholeNum + val);
      });
    }
  }

  // Parse amount: handles "2", "1/2", "1 1/2", "2.5", "200"
  // Important: try fraction first to avoid "1" in "1/2" matching as a whole number
  let amount = 0;
  let rest = s;

  // Match: whole number + fraction (e.g. "1 1/2")
  const wholeAndFrac = rest.match(/^(\d+)\s+(\d+\/\d+)\s*/);
  if (wholeAndFrac) {
    amount = parseInt(wholeAndFrac[1], 10);
    const frac = FRACTION_MAP[wholeAndFrac[2]];
    if (frac) amount += frac;
    rest = rest.slice(wholeAndFrac[0].length);
  } else {
    // Match: fraction only (e.g. "1/2")
    const fracOnly = rest.match(/^(\d+\/\d+)\s*/);
    if (fracOnly) {
      const frac = FRACTION_MAP[fracOnly[1]];
      if (frac) amount = frac;
      rest = rest.slice(fracOnly[0].length);
    } else {
      // Match: decimal or integer (e.g. "200", "2.5")
      const numOnly = rest.match(/^(\d+(?:\.\d+)?)\s*/);
      if (numOnly) {
        amount = parseFloat(numOnly[1]);
        rest = rest.slice(numOnly[0].length);
      }
    }
  }

  // Match unit
  const unitPattern = new RegExp(`^(${UNIT_PATTERN})\\.?\\s*(?:of\\s+)?`, "i");
  const unitMatch = rest.match(unitPattern);
  let unit: IngredientUnit | null = null;
  if (unitMatch) {
    unit = UNIT_ALIASES[unitMatch[1].toLowerCase()] || null;
    rest = rest.slice(unitMatch[0].length);
  }

  const name = rest.trim();

  if (amount === 0 && !unit) {
    // No amount or unit found — treat entire string as the name
    return { name: raw.trim(), amount: null, unit: null, raw };
  }

  return {
    name: name || raw.trim(),
    amount: amount > 0 ? amount : null,
    unit,
    raw,
  };
}

// ─── JSON-LD Extraction ───────────────────────────────────────────────────────

/**
 * Extract all JSON-LD blocks from HTML.
 */
function extractJsonLd(html: string): unknown[] {
  const results: unknown[] = [];
  // Match <script type="application/ld+json">...</script>
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      results.push(parsed);
    } catch {
      // Skip malformed JSON-LD blocks
    }
  }
  return results;
}

/**
 * Find a Recipe object in parsed JSON-LD data.
 * Handles direct Recipe objects, @graph arrays, and nested structures.
 */
function findRecipeInJsonLd(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  // Check if this object is a Recipe
  const type = obj["@type"];
  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
    return obj;
  }

  // Check @graph array
  if (Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"]) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
  }

  // Check if it's an array at the top level
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
  }

  return null;
}

// ─── Recipe Data Extraction ───────────────────────────────────────────────────

/**
 * Extract image URL from the Schema.org image field.
 * Can be: string, array of strings, ImageObject, or array of ImageObjects.
 */
function extractImage(image: unknown): string | null {
  if (!image) return null;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) {
    const first = image[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in first) {
      return String((first as Record<string, unknown>).url);
    }
    return null;
  }
  if (typeof image === "object" && image !== null && "url" in image) {
    return String((image as Record<string, unknown>).url);
  }
  return null;
}

/**
 * Extract servings from recipeYield.
 * Can be: number, string like "4", "4 servings", or array.
 */
function extractServings(recipeYield: unknown): number | null {
  if (recipeYield == null) return null;
  if (typeof recipeYield === "number") return recipeYield;
  if (Array.isArray(recipeYield)) {
    // Try the first element
    return extractServings(recipeYield[0]);
  }
  if (typeof recipeYield === "string") {
    const match = recipeYield.match(/^(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Normalize recipeInstructions to a single newline-delimited string.
 * Handles: string, string[], HowToStep[], HowToSection[], and mixed arrays.
 */
function extractInstructions(instructions: unknown): string | null {
  if (!instructions) return null;

  if (typeof instructions === "string") {
    // Strip HTML tags
    return stripHtml(instructions).trim() || null;
  }

  if (Array.isArray(instructions)) {
    const steps: string[] = [];

    for (const item of instructions) {
      if (typeof item === "string") {
        const text = stripHtml(item).trim();
        if (text) steps.push(text);
      } else if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const type = obj["@type"];

        if (type === "HowToStep") {
          const text = stripHtml(String(obj.text || "")).trim();
          if (text) steps.push(text);
        } else if (type === "HowToSection") {
          // Section with nested steps
          const sectionName = obj.name ? String(obj.name) : null;
          if (sectionName) steps.push(`${sectionName}:`);

          const subItems = obj.itemListElement;
          if (Array.isArray(subItems)) {
            for (const subItem of subItems) {
              if (typeof subItem === "string") {
                const text = stripHtml(subItem).trim();
                if (text) steps.push(text);
              } else if (subItem && typeof subItem === "object") {
                const sub = subItem as Record<string, unknown>;
                const text = stripHtml(String(sub.text || "")).trim();
                if (text) steps.push(text);
              }
            }
          }
        }
      }
    }

    return steps.length > 0 ? steps.join("\n") : null;
  }

  return null;
}

/**
 * Strip HTML tags from a string.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract ingredients from Schema.org recipeIngredient field.
 */
function extractIngredients(recipeIngredient: unknown): ScrapedIngredient[] {
  if (!recipeIngredient || !Array.isArray(recipeIngredient)) return [];

  return recipeIngredient
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((raw) => parseIngredientString(raw));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse recipe data from HTML string containing JSON-LD.
 * Pure function — no network calls.
 */
export function parseRecipeFromHtml(html: string, sourceUrl: string): ScrapedRecipe | null {
  const jsonLdBlocks = extractJsonLd(html);

  for (const block of jsonLdBlocks) {
    const recipe = findRecipeInJsonLd(block);
    if (recipe) {
      return {
        name: String(recipe.name || "Untitled Recipe"),
        description: recipe.description ? stripHtml(String(recipe.description)) : null,
        instructions: extractInstructions(recipe.recipeInstructions),
        prepTime: parseDuration(recipe.prepTime as string | null | undefined),
        cookTime: parseDuration(recipe.cookTime as string | null | undefined),
        servings: extractServings(recipe.recipeYield),
        imageUrl: extractImage(recipe.image),
        ingredients: extractIngredients(recipe.recipeIngredient),
        sourceUrl,
      };
    }
  }

  return null;
}

/**
 * Fetch a URL and extract recipe data from the page.
 */
export async function scrapeRecipe(url: string): Promise<ScrapedRecipe> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Tuis Recipe Importer)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("Request timed out while fetching the recipe page");
    }
    throw new Error(`Failed to fetch URL: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: HTTP ${response.status}`);
  }

  const html = await response.text();
  const recipe = parseRecipeFromHtml(html, url);

  if (!recipe) {
    throw new Error("No recipe data found on this page. The site may not include structured recipe data.");
  }

  return recipe;
}
