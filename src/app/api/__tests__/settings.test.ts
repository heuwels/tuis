import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";

// ─── In-memory DB wiring ────────────────────────────────────────────────────

let testDb: ReturnType<typeof drizzle>;
let sqlite: Database.Database;

vi.mock("@/lib/db", () => ({
  get db() {
    return testDb;
  },
  schema,
}));

function createTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

beforeEach(() => {
  sqlite = new Database(":memory:");
  testDb = drizzle(sqlite, { schema });
  createTables();
});

afterEach(() => {
  sqlite.close();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(`http://localhost${url}`, init);
}

function jsonBody(data: Record<string, unknown>): RequestInit {
  return {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS API
// ═══════════════════════════════════════════════════════════════════════════

describe("Settings API", () => {
  let settingsRoute: typeof import("@/app/api/settings/route");

  beforeEach(async () => {
    settingsRoute = await import("@/app/api/settings/route");
  });

  describe("GET /api/settings", () => {
    it("returns empty object when no settings", async () => {
      const res = await settingsRoute.GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({});
    });

    it("returns all settings as key-value pairs", async () => {
      // Insert settings directly
      sqlite.exec(
        `INSERT INTO settings (key, value) VALUES ('unitSystem', 'metric')`
      );
      sqlite.exec(
        `INSERT INTO settings (key, value) VALUES ('theme', 'dark')`
      );

      const res = await settingsRoute.GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.unitSystem).toBe("metric");
      expect(data.theme).toBe("dark");
    });
  });

  describe("PUT /api/settings", () => {
    it("creates a new setting", async () => {
      const req = makeRequest(
        "/api/settings",
        jsonBody({ key: "unitSystem", value: "metric" })
      );
      const res = await settingsRoute.PUT(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.key).toBe("unitSystem");
      expect(data.value).toBe("metric");

      // Verify it's persisted
      const getRes = await settingsRoute.GET();
      const settings = await getRes.json();
      expect(settings.unitSystem).toBe("metric");
    });

    it("updates an existing setting", async () => {
      // Create first
      const req1 = makeRequest(
        "/api/settings",
        jsonBody({ key: "unitSystem", value: "metric" })
      );
      await settingsRoute.PUT(req1);

      // Update
      const req2 = makeRequest(
        "/api/settings",
        jsonBody({ key: "unitSystem", value: "imperial" })
      );
      const res = await settingsRoute.PUT(req2);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.value).toBe("imperial");

      // Verify it's updated
      const getRes = await settingsRoute.GET();
      const settings = await getRes.json();
      expect(settings.unitSystem).toBe("imperial");
    });

    it("rejects missing key", async () => {
      const req = makeRequest(
        "/api/settings",
        jsonBody({ value: "metric" })
      );
      const res = await settingsRoute.PUT(req);
      expect(res.status).toBe(400);
    });

    it("rejects missing value", async () => {
      const req = makeRequest(
        "/api/settings",
        jsonBody({ key: "unitSystem" })
      );
      const res = await settingsRoute.PUT(req);
      expect(res.status).toBe(400);
    });

    it("rejects invalid unitSystem value", async () => {
      const req = makeRequest(
        "/api/settings",
        jsonBody({ key: "unitSystem", value: "invalid" })
      );
      const res = await settingsRoute.PUT(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("metric");
    });

    it("accepts valid unitSystem values", async () => {
      for (const value of ["metric", "imperial"]) {
        const req = makeRequest(
          "/api/settings",
          jsonBody({ key: "unitSystem", value })
        );
        const res = await settingsRoute.PUT(req);
        expect(res.status).toBe(200);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIT CONVERSION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

describe("Unit Conversions", () => {
  let units: typeof import("@/lib/units");

  beforeEach(async () => {
    units = await import("@/lib/units");
  });

  describe("distance", () => {
    it("converts km to miles", () => {
      expect(units.kmToMiles(100)).toBeCloseTo(62.137, 2);
    });

    it("converts miles to km", () => {
      expect(units.milesToKm(62.137)).toBeCloseTo(100, 0);
    });

    it("formats distance in metric", () => {
      expect(units.formatDistance(1500, "metric")).toBe("1,500 km");
    });

    it("formats distance in imperial", () => {
      expect(units.formatDistance(100, "imperial")).toBe("62 mi");
    });
  });

  describe("volume", () => {
    it("converts litres to gallons", () => {
      expect(units.litresToGallons(3.785)).toBeCloseTo(1.0, 1);
    });

    it("converts gallons to litres", () => {
      expect(units.gallonsToLitres(1.0)).toBeCloseTo(3.785, 2);
    });

    it("formats volume in metric", () => {
      expect(units.formatVolume(45.5, "metric")).toBe("45.50 L");
    });

    it("formats volume in imperial", () => {
      expect(units.formatVolume(45.5, "imperial")).toBe("12.02 gal");
    });
  });

  describe("weight", () => {
    it("converts kg to pounds", () => {
      expect(units.kgToPounds(1)).toBeCloseTo(2.205, 2);
    });

    it("converts grams to ounces", () => {
      expect(units.gramsToOunces(100)).toBeCloseTo(3.527, 2);
    });

    it("formats weight in grams metric", () => {
      expect(units.formatWeightG(500, "metric")).toBe("500 g");
    });

    it("formats weight in grams imperial (oz)", () => {
      expect(units.formatWeightG(100, "imperial")).toBe("3.5 oz");
    });

    it("formats large weight in grams as kg", () => {
      expect(units.formatWeightG(1500, "metric")).toBe("1.5 kg");
    });

    it("formats large weight in grams as lb", () => {
      expect(units.formatWeightG(500, "imperial")).toBe("1.1 lb");
    });
  });

  describe("temperature", () => {
    it("converts 0C to 32F", () => {
      expect(units.celsiusToFahrenheit(0)).toBe(32);
    });

    it("converts 100C to 212F", () => {
      expect(units.celsiusToFahrenheit(100)).toBe(212);
    });

    it("converts 32F to 0C", () => {
      expect(units.fahrenheitToCelsius(32)).toBe(0);
    });

    it("formats temperature metric", () => {
      expect(units.formatTemperature(20, "metric")).toBe("20\u00B0C");
    });

    it("formats temperature imperial", () => {
      expect(units.formatTemperature(20, "imperial")).toBe("68\u00B0F");
    });
  });

  describe("fuel economy", () => {
    it("formats L/100km in metric", () => {
      expect(units.formatFuelEconomy(8.5, "metric")).toBe("8.5 L/100km");
    });

    it("formats MPG in imperial", () => {
      // 8.5 L/100km = ~27.7 MPG
      expect(units.formatFuelEconomy(8.5, "imperial")).toBe("27.7 MPG");
    });
  });

  describe("cost per volume", () => {
    it("formats cost per litre in metric", () => {
      expect(units.formatCostPerVolume(1.5, "metric")).toBe("$1.500/L");
    });

    it("formats cost per gallon in imperial", () => {
      // $1.50/L = ~$5.68/gal
      expect(units.formatCostPerVolume(1.5, "imperial")).toBe("$5.678/gal");
    });
  });

  describe("cost per distance", () => {
    it("formats cost per km in metric", () => {
      expect(units.formatCostPerDistance(0.15, "metric")).toBe("$0.15/km");
    });

    it("formats cost per mile in imperial", () => {
      // $0.15/km = ~$0.24/mi
      expect(units.formatCostPerDistance(0.15, "imperial")).toBe("$0.24/mi");
    });
  });

  describe("unit labels", () => {
    it("returns metric labels", () => {
      const labels = units.getUnitLabels("metric");
      expect(labels.km).toBe("km");
      expect(labels.litresShort).toBe("L");
      expect(labels.kg).toBe("kg");
    });

    it("returns imperial labels", () => {
      const labels = units.getUnitLabels("imperial");
      expect(labels.km).toBe("mi");
      expect(labels.litresShort).toBe("gal");
      expect(labels.kg).toBe("lb");
    });
  });
});
