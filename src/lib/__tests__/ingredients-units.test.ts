import { describe, it, expect } from "vitest";
import {
  getUnitsForSystem,
  scaleAmount,
  formatIngredient,
  parseQuantityString,
  aggregateIngredients,
  type IngredientUnit,
} from "../ingredients";

describe("getUnitsForSystem", () => {
  it("returns metric units by default", () => {
    const units = getUnitsForSystem("metric");
    expect(units).toContain("g");
    expect(units).toContain("kg");
    expect(units).toContain("mL");
    expect(units).toContain("L");
    expect(units).toContain("cup");
    expect(units).toContain("tbsp");
    expect(units).toContain("tsp");
    expect(units).toContain("whole");
    expect(units).not.toContain("oz");
    expect(units).not.toContain("lb");
  });

  it("returns imperial units", () => {
    const units = getUnitsForSystem("imperial");
    expect(units).toContain("oz");
    expect(units).toContain("lb");
    expect(units).toContain("fl oz");
    expect(units).toContain("pint");
    expect(units).toContain("quart");
    expect(units).toContain("gallon");
    expect(units).toContain("cup");
    expect(units).toContain("tbsp");
    expect(units).toContain("tsp");
    expect(units).toContain("whole");
    expect(units).not.toContain("g");
    expect(units).not.toContain("kg");
  });
});

describe("scaleAmount with imperial units", () => {
  it("scales oz and stays in imperial", () => {
    const result = scaleAmount(8, "oz", 2);
    expect(result.unit).toBe("lb");
    expect(result.amount).toBeCloseTo(1, 0);
  });

  it("scales lb and stays in imperial", () => {
    const result = scaleAmount(1, "lb", 0.5);
    expect(result.unit).toBe("oz");
    expect(result.amount).toBeCloseTo(8, 0);
  });

  it("scales fl oz and stays in imperial", () => {
    const result = scaleAmount(8, "fl oz", 2);
    expect(result.unit).toBe("pint");
    expect(result.amount).toBeCloseTo(1, 0);
  });

  it("scales pint to quart", () => {
    const result = scaleAmount(1, "pint", 4);
    expect(result.unit).toBe("quart");
    expect(result.amount).toBeCloseTo(2, 0);
  });

  it("scales quart to gallon", () => {
    const result = scaleAmount(1, "quart", 4);
    expect(result.unit).toBe("gallon");
    expect(result.amount).toBeCloseTo(1, 0);
  });

  it("keeps metric scaling unchanged", () => {
    const result = scaleAmount(500, "g", 3);
    expect(result.unit).toBe("kg");
    expect(result.amount).toBeCloseTo(1.5, 1);
  });
});

describe("formatIngredient with imperial units", () => {
  it("formats oz without space", () => {
    expect(formatIngredient(8, "oz")).toBe("8oz");
  });

  it("formats lb without space", () => {
    expect(formatIngredient(2, "lb")).toBe("2lb");
  });

  it("formats fl oz with space", () => {
    expect(formatIngredient(4, "fl oz")).toBe("4 fl oz");
  });

  it("formats pint with space", () => {
    expect(formatIngredient(1, "pint")).toBe("1 pint");
  });

  it("formats gallon with space", () => {
    expect(formatIngredient(0.5, "gallon")).toBe("0.5 gallon");
  });
});

describe("parseQuantityString with imperial units", () => {
  it("parses oz", () => {
    const result = parseQuantityString("8 oz");
    expect(result).toEqual({ amount: 8, unit: "oz" });
  });

  it("parses ounces", () => {
    const result = parseQuantityString("4 ounces");
    expect(result).toEqual({ amount: 4, unit: "oz" });
  });

  it("parses lb", () => {
    const result = parseQuantityString("2 lb");
    expect(result).toEqual({ amount: 2, unit: "lb" });
  });

  it("parses lbs", () => {
    const result = parseQuantityString("3 lbs");
    expect(result).toEqual({ amount: 3, unit: "lb" });
  });

  it("parses pounds", () => {
    const result = parseQuantityString("1 pound");
    expect(result).toEqual({ amount: 1, unit: "lb" });
  });

  it("parses pint", () => {
    const result = parseQuantityString("2 pints");
    expect(result).toEqual({ amount: 2, unit: "pint" });
  });

  it("parses quart", () => {
    const result = parseQuantityString("1 qt");
    expect(result).toEqual({ amount: 1, unit: "quart" });
  });

  it("parses gallon", () => {
    const result = parseQuantityString("1 gallon");
    expect(result).toEqual({ amount: 1, unit: "gallon" });
  });

  it("parses fl oz (multi-word unit)", () => {
    const result = parseQuantityString("4 fl oz");
    expect(result).toEqual({ amount: 4, unit: "fl oz" });
  });

  it("parses floz (single-word alias)", () => {
    const result = parseQuantityString("8 floz");
    expect(result).toEqual({ amount: 8, unit: "fl oz" });
  });
});

describe("aggregateIngredients cross-system", () => {
  it("aggregates metric and imperial weights into the original system", () => {
    const result = aggregateIngredients([
      { name: "Chicken", amount: 500, unit: "g" as IngredientUnit, quantity: null },
      { name: "Chicken", amount: 1, unit: "lb" as IngredientUnit, quantity: null },
    ]);

    const chicken = result.find((r) => r.name === "Chicken" && r.amount != null);
    expect(chicken).toBeTruthy();
    // 500g + 453.592g = 953.592g → should display as g (under 1000)
    expect(chicken!.unit).toBe("g");
    expect(chicken!.amount).toBeCloseTo(953.6, 0);
  });
});
