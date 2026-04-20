import { describe, it, expect } from "vitest";
import {
  parseRecipeFromHtml,
  parseDuration,
  parseIngredientString,
} from "@/lib/recipe-scraper";

// ─── Helper: wrap JSON-LD in HTML ──────────────────────────────────────────────

function makeHtml(jsonLd: unknown): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    </head>
    <body><h1>Test</h1></body>
    </html>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ISO 8601 Duration Parsing
// ═══════════════════════════════════════════════════════════════════════════════

describe("parseDuration", () => {
  it("parses PT30M to 30 minutes", () => {
    expect(parseDuration("PT30M")).toBe(30);
  });

  it("parses PT1H to 60 minutes", () => {
    expect(parseDuration("PT1H")).toBe(60);
  });

  it("parses PT1H15M to 75 minutes", () => {
    expect(parseDuration("PT1H15M")).toBe(75);
  });

  it("parses PT1H30M to 90 minutes", () => {
    expect(parseDuration("PT1H30M")).toBe(90);
  });

  it("parses PT2H15M to 135 minutes", () => {
    expect(parseDuration("PT2H15M")).toBe(135);
  });

  it("parses PT45S by rounding up to 1 minute", () => {
    expect(parseDuration("PT45S")).toBe(1);
  });

  it("returns null for empty string", () => {
    expect(parseDuration("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseDuration(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseDuration(undefined)).toBeNull();
  });

  it("returns null for invalid duration format", () => {
    expect(parseDuration("not-a-duration")).toBeNull();
  });

  it("returns null for P0T (no time component)", () => {
    expect(parseDuration("PT")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Ingredient String Parsing
// ═══════════════════════════════════════════════════════════════════════════════

describe("parseIngredientString", () => {
  it("parses '2 cups all-purpose flour'", () => {
    const result = parseIngredientString("2 cups all-purpose flour");
    expect(result.amount).toBe(2);
    expect(result.unit).toBe("cup");
    expect(result.name).toBe("all-purpose flour");
  });

  it("parses '1/2 tsp salt'", () => {
    const result = parseIngredientString("1/2 tsp salt");
    expect(result.amount).toBe(0.5);
    expect(result.unit).toBe("tsp");
    expect(result.name).toBe("salt");
  });

  it("parses '200g butter'", () => {
    const result = parseIngredientString("200g butter");
    expect(result.amount).toBe(200);
    expect(result.unit).toBe("g");
    expect(result.name).toBe("butter");
  });

  it("parses '1 1/2 cups sugar'", () => {
    const result = parseIngredientString("1 1/2 cups sugar");
    expect(result.amount).toBe(1.5);
    expect(result.unit).toBe("cup");
    expect(result.name).toBe("sugar");
  });

  it("parses '3 tablespoons olive oil'", () => {
    const result = parseIngredientString("3 tablespoons olive oil");
    expect(result.amount).toBe(3);
    expect(result.unit).toBe("tbsp");
    expect(result.name).toBe("olive oil");
  });

  it("parses '500 mL water'", () => {
    const result = parseIngredientString("500 mL water");
    expect(result.amount).toBe(500);
    expect(result.unit).toBe("mL");
    expect(result.name).toBe("water");
  });

  it("returns name-only for unparseable strings", () => {
    const result = parseIngredientString("Salt and pepper to taste");
    expect(result.amount).toBeNull();
    expect(result.unit).toBeNull();
    expect(result.name).toBe("Salt and pepper to taste");
  });

  it("preserves the raw string", () => {
    const result = parseIngredientString("2 cups flour");
    expect(result.raw).toBe("2 cups flour");
  });

  it("parses '1 kg chicken thighs'", () => {
    const result = parseIngredientString("1 kg chicken thighs");
    expect(result.amount).toBe(1);
    expect(result.unit).toBe("kg");
    expect(result.name).toBe("chicken thighs");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Recipe JSON-LD Parsing
// ═══════════════════════════════════════════════════════════════════════════════

describe("parseRecipeFromHtml", () => {
  it("extracts recipe from direct Recipe JSON-LD", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Chocolate Chip Cookies",
      description: "Classic homemade cookies",
      prepTime: "PT15M",
      cookTime: "PT12M",
      recipeYield: "24 cookies",
      recipeIngredient: [
        "2 cups all-purpose flour",
        "1 tsp baking soda",
        "200g butter",
      ],
      recipeInstructions: [
        {
          "@type": "HowToStep",
          text: "Preheat oven to 375F.",
        },
        {
          "@type": "HowToStep",
          text: "Mix dry ingredients.",
        },
      ],
      image: "https://example.com/cookies.jpg",
    });

    const result = parseRecipeFromHtml(html, "https://example.com/cookies");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Chocolate Chip Cookies");
    expect(result!.description).toBe("Classic homemade cookies");
    expect(result!.prepTime).toBe(15);
    expect(result!.cookTime).toBe(12);
    expect(result!.servings).toBe(24);
    expect(result!.imageUrl).toBe("https://example.com/cookies.jpg");
    expect(result!.ingredients).toHaveLength(3);
    expect(result!.ingredients[0].name).toBe("all-purpose flour");
    expect(result!.ingredients[0].amount).toBe(2);
    expect(result!.ingredients[0].unit).toBe("cup");
    expect(result!.instructions).toContain("Preheat oven to 375F.");
    expect(result!.instructions).toContain("Mix dry ingredients.");
    expect(result!.sourceUrl).toBe("https://example.com/cookies");
  });

  it("extracts recipe from @graph array", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: "Some Page",
        },
        {
          "@type": "Recipe",
          name: "Graph Recipe",
          prepTime: "PT30M",
          recipeIngredient: ["1 cup rice"],
          recipeInstructions: "Cook the rice.",
        },
      ],
    });

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Graph Recipe");
    expect(result!.prepTime).toBe(30);
  });

  it("handles @type as array", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@type": ["Recipe"],
      name: "Array Type Recipe",
      recipeIngredient: [],
    });

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Array Type Recipe");
  });

  it("handles string instructions", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Simple Recipe",
      recipeInstructions: "Step 1. Mix everything. Step 2. Bake at 350F.",
    });

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result!.instructions).toBe(
      "Step 1. Mix everything. Step 2. Bake at 350F."
    );
  });

  it("handles array of string instructions", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "List Recipe",
      recipeInstructions: ["Mix ingredients.", "Bake for 30 minutes."],
    });

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result!.instructions).toBe(
      "Mix ingredients.\nBake for 30 minutes."
    );
  });

  it("handles HowToSection instructions", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Sectioned Recipe",
      recipeInstructions: [
        {
          "@type": "HowToSection",
          name: "For the dough",
          itemListElement: [
            { "@type": "HowToStep", text: "Mix flour and water." },
            { "@type": "HowToStep", text: "Knead for 10 minutes." },
          ],
        },
        {
          "@type": "HowToSection",
          name: "For the filling",
          itemListElement: [
            { "@type": "HowToStep", text: "Cook the meat." },
          ],
        },
      ],
    });

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result!.instructions).toContain("For the dough:");
    expect(result!.instructions).toContain("Mix flour and water.");
    expect(result!.instructions).toContain("For the filling:");
    expect(result!.instructions).toContain("Cook the meat.");
  });

  it("extracts image from array of strings", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Image Test",
      image: [
        "https://example.com/large.jpg",
        "https://example.com/small.jpg",
      ],
    });

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result!.imageUrl).toBe("https://example.com/large.jpg");
  });

  it("extracts image from ImageObject", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Image Object Test",
      image: {
        "@type": "ImageObject",
        url: "https://example.com/photo.jpg",
      },
    });

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result!.imageUrl).toBe("https://example.com/photo.jpg");
  });

  it("extracts numeric servings from recipeYield", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Yield Test",
      recipeYield: 6,
    });

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result!.servings).toBe(6);
  });

  it("extracts servings from string recipeYield", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Yield String",
      recipeYield: "4 servings",
    });

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result!.servings).toBe(4);
  });

  it("extracts servings from array recipeYield", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Yield Array",
      recipeYield: ["8", "8 slices"],
    });

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result!.servings).toBe(8);
  });

  it("returns null when no recipe JSON-LD is found", () => {
    const html = `
      <!DOCTYPE html>
      <html><head></head><body><h1>Not a recipe</h1></body></html>
    `;
    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result).toBeNull();
  });

  it("returns null when JSON-LD exists but is not a Recipe", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@type": "Article",
      name: "Not a recipe",
    });
    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result).toBeNull();
  });

  it("handles multiple JSON-LD blocks and finds the Recipe", () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script type="application/ld+json">${JSON.stringify({
          "@type": "WebSite",
          name: "Example",
        })}</script>
        <script type="application/ld+json">${JSON.stringify({
          "@type": "Recipe",
          name: "Found Recipe",
          recipeIngredient: ["1 cup water"],
        })}</script>
      </head>
      <body></body>
      </html>
    `;

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Found Recipe");
  });

  it("strips HTML from instructions", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "HTML Instructions",
      recipeInstructions: "<p>Mix <strong>well</strong>.</p><p>Bake at 350&deg;F.</p>",
    });

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result!.instructions).not.toContain("<p>");
    expect(result!.instructions).not.toContain("<strong>");
    expect(result!.instructions).toContain("Mix well.");
  });

  it("handles missing optional fields gracefully", () => {
    const html = makeHtml({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Minimal Recipe",
    });

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Minimal Recipe");
    expect(result!.description).toBeNull();
    expect(result!.instructions).toBeNull();
    expect(result!.prepTime).toBeNull();
    expect(result!.cookTime).toBeNull();
    expect(result!.servings).toBeNull();
    expect(result!.imageUrl).toBeNull();
    expect(result!.ingredients).toHaveLength(0);
  });

  it("handles malformed JSON-LD gracefully", () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script type="application/ld+json">{ this is not valid json }</script>
        <script type="application/ld+json">${JSON.stringify({
          "@type": "Recipe",
          name: "Valid Recipe",
        })}</script>
      </head>
      <body></body>
      </html>
    `;

    const result = parseRecipeFromHtml(html, "https://example.com");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Valid Recipe");
  });
});
