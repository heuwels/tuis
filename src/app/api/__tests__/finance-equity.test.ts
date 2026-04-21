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
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      purchase_price REAL NOT NULL,
      purchase_date TEXT NOT NULL,
      loan_amount_original REAL NOT NULL,
      loan_term_years INTEGER,
      lender TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS mortgage_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id),
      effective_date TEXT NOT NULL,
      annual_rate REAL NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS mortgage_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id),
      date TEXT NOT NULL,
      payment_amount REAL NOT NULL,
      interest_amount REAL NOT NULL,
      principal_amount REAL NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS property_valuations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id),
      date TEXT NOT NULL,
      estimated_value REAL NOT NULL,
      source TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS property_income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id),
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      tenant TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
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

function makeRequest(url: string, init?: RequestInit) {
  return new Request(`http://localhost${url}`, init) as unknown as import("next/server").NextRequest;
}

function jsonBody(data: Record<string, unknown>): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

function putBody(data: Record<string, unknown>): RequestInit {
  return {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// ─── Insert helpers (raw SQL for setting up test state) ─────────────────────

function insertProperty(
  address: string,
  purchasePrice: number,
  purchaseDate: string,
  loanAmountOriginal: number,
  extra: Record<string, unknown> = {}
) {
  const cols = ["address", "purchase_price", "purchase_date", "loan_amount_original", ...Object.keys(extra)];
  const vals = [address, purchasePrice, purchaseDate, loanAmountOriginal, ...Object.values(extra)];
  const placeholders = cols.map(() => "?").join(", ");
  return sqlite
    .prepare(`INSERT INTO properties (${cols.join(", ")}) VALUES (${placeholders})`)
    .run(...vals);
}

function insertPayment(
  propertyId: number,
  date: string,
  paymentAmount: number,
  interestAmount: number,
  principalAmount: number
) {
  return sqlite
    .prepare(
      `INSERT INTO mortgage_payments (property_id, date, payment_amount, interest_amount, principal_amount) VALUES (?, ?, ?, ?, ?)`
    )
    .run(propertyId, date, paymentAmount, interestAmount, principalAmount);
}

function insertRate(propertyId: number, effectiveDate: string, annualRate: number) {
  return sqlite
    .prepare(
      `INSERT INTO mortgage_rates (property_id, effective_date, annual_rate) VALUES (?, ?, ?)`
    )
    .run(propertyId, effectiveDate, annualRate);
}

function insertValuation(propertyId: number, date: string, estimatedValue: number, source?: string) {
  return sqlite
    .prepare(
      `INSERT INTO property_valuations (property_id, date, estimated_value, source) VALUES (?, ?, ?, ?)`
    )
    .run(propertyId, date, estimatedValue, source ?? null);
}

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY & EQUITY API
// ═══════════════════════════════════════════════════════════════════════════

describe("Property & Equity API", () => {
  let propertiesRoute: typeof import("@/app/api/finance/properties/route");
  let propertiesIdRoute: typeof import("@/app/api/finance/properties/[id]/route");
  let paymentsRoute: typeof import("@/app/api/finance/properties/[id]/payments/route");
  let ratesRoute: typeof import("@/app/api/finance/properties/[id]/rates/route");
  let valuationsRoute: typeof import("@/app/api/finance/properties/[id]/valuations/route");
  let equityRoute: typeof import("@/app/api/finance/properties/[id]/equity/route");

  beforeEach(async () => {
    propertiesRoute = await import("@/app/api/finance/properties/route");
    propertiesIdRoute = await import("@/app/api/finance/properties/[id]/route");
    paymentsRoute = await import("@/app/api/finance/properties/[id]/payments/route");
    ratesRoute = await import("@/app/api/finance/properties/[id]/rates/route");
    valuationsRoute = await import("@/app/api/finance/properties/[id]/valuations/route");
    equityRoute = await import("@/app/api/finance/properties/[id]/equity/route");
  });

  // ── Property CRUD ─────────────────────────────────────────────────────

  describe("Property CRUD", () => {
    it("creates a property via POST", async () => {
      const req = makeRequest(
        "/api/finance/properties",
        jsonBody({
          address: "42 Test St, Sydney",
          purchasePrice: 500000,
          purchaseDate: "2025-01-15",
          loanAmountOriginal: 400000,
          loanTermYears: 30,
          lender: "CBA",
        })
      );
      const res = await propertiesRoute.POST(req);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Number(data.id)).toBeGreaterThan(0);

      const row = sqlite
        .prepare("SELECT * FROM properties WHERE id = ?")
        .get(Number(data.id)) as Record<string, unknown>;
      expect(row.address).toBe("42 Test St, Sydney");
      expect(row.purchase_price).toBe(500000);
      expect(row.loan_amount_original).toBe(400000);
      expect(row.lender).toBe("CBA");
    });

    it("lists properties via GET", async () => {
      insertProperty("1 Alpha St", 600000, "2024-01-01", 480000);
      insertProperty("2 Beta St", 700000, "2024-06-01", 560000);

      const req = makeRequest("/api/finance/properties");
      const res = await propertiesRoute.GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(2);
    });

    it("gets a single property by id", async () => {
      const result = insertProperty("99 Gamma Rd", 550000, "2024-03-15", 440000);
      const id = String(result.lastInsertRowid);

      const req = makeRequest(`/api/finance/properties/${id}`);
      const res = await propertiesIdRoute.GET(req, makeParams(id));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.address).toBe("99 Gamma Rd");
      expect(data.purchasePrice).toBe(550000);
    });

    it("updates a property via PUT", async () => {
      const result = insertProperty("Old Address", 500000, "2024-01-01", 400000);
      const id = String(result.lastInsertRowid);

      const req = makeRequest(
        `/api/finance/properties/${id}`,
        putBody({ address: "New Address", lender: "Westpac" })
      );
      const res = await propertiesIdRoute.PUT(req, makeParams(id));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });

      const row = sqlite
        .prepare("SELECT address, lender FROM properties WHERE id = ?")
        .get(id) as Record<string, unknown>;
      expect(row.address).toBe("New Address");
      expect(row.lender).toBe("Westpac");
    });
  });

  // ── Mortgage Payments ─────────────────────────────────────────────────

  describe("Mortgage Payments", () => {
    let propertyId: number;

    beforeEach(() => {
      const result = insertProperty("Payment Test St", 500000, "2025-01-01", 400000);
      propertyId = Number(result.lastInsertRowid);
    });

    it("creates a payment via POST", async () => {
      const req = makeRequest(
        `/api/finance/properties/${propertyId}/payments`,
        jsonBody({
          date: "2025-02-01",
          paymentAmount: 2500,
          interestAmount: 2100,
          principalAmount: 400,
        })
      );
      const res = await paymentsRoute.POST(req, makeParams(String(propertyId)));

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Number(data.id)).toBeGreaterThan(0);
    });

    it("lists payments ordered by date desc", async () => {
      insertPayment(propertyId, "2025-02-01", 2500, 2100, 400);
      insertPayment(propertyId, "2025-03-01", 2500, 2080, 420);
      insertPayment(propertyId, "2025-04-01", 2500, 2060, 440);

      const req = makeRequest(`/api/finance/properties/${propertyId}/payments`);
      const res = await paymentsRoute.GET(req, makeParams(String(propertyId)));
      const data = await res.json();

      expect(data).toHaveLength(3);
      expect(data[0].date).toBe("2025-04-01");
      expect(data[2].date).toBe("2025-02-01");
    });

    it("supports date range filter", async () => {
      insertPayment(propertyId, "2025-01-01", 2500, 2150, 350);
      insertPayment(propertyId, "2025-03-01", 2500, 2100, 400);
      insertPayment(propertyId, "2025-05-01", 2500, 2050, 450);

      const req = makeRequest(
        `/api/finance/properties/${propertyId}/payments?from=2025-02-01&to=2025-04-30`
      );
      const res = await paymentsRoute.GET(req, makeParams(String(propertyId)));
      const data = await res.json();

      expect(data).toHaveLength(1);
      expect(data[0].date).toBe("2025-03-01");
    });
  });

  // ── Mortgage Rates ────────────────────────────────────────────────────

  describe("Mortgage Rates", () => {
    let propertyId: number;

    beforeEach(() => {
      const result = insertProperty("Rate Test St", 500000, "2025-01-01", 400000);
      propertyId = Number(result.lastInsertRowid);
    });

    it("creates a rate via POST", async () => {
      const req = makeRequest(
        `/api/finance/properties/${propertyId}/rates`,
        jsonBody({
          effectiveDate: "2025-01-01",
          annualRate: 0.0599,
          notes: "Initial rate",
        })
      );
      const res = await ratesRoute.POST(req, makeParams(String(propertyId)));

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("lists rates ordered by effectiveDate desc", async () => {
      insertRate(propertyId, "2025-01-01", 0.0599);
      insertRate(propertyId, "2025-06-01", 0.0575);

      const req = makeRequest(`/api/finance/properties/${propertyId}/rates`);
      const res = await ratesRoute.GET(req, makeParams(String(propertyId)));
      const data = await res.json();

      expect(data).toHaveLength(2);
      expect(data[0].effectiveDate).toBe("2025-06-01");
      expect(data[1].effectiveDate).toBe("2025-01-01");
    });
  });

  // ── Valuations ────────────────────────────────────────────────────────

  describe("Valuations", () => {
    let propertyId: number;

    beforeEach(() => {
      const result = insertProperty("Valuation Test St", 500000, "2025-01-01", 400000);
      propertyId = Number(result.lastInsertRowid);
    });

    it("creates a valuation via POST", async () => {
      const req = makeRequest(
        `/api/finance/properties/${propertyId}/valuations`,
        jsonBody({
          date: "2025-06-01",
          estimatedValue: 520000,
          source: "CoreLogic",
        })
      );
      const res = await valuationsRoute.POST(req, makeParams(String(propertyId)));

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("lists valuations ordered by date desc", async () => {
      insertValuation(propertyId, "2025-03-01", 510000, "Agent");
      insertValuation(propertyId, "2025-06-01", 520000, "CoreLogic");

      const req = makeRequest(`/api/finance/properties/${propertyId}/valuations`);
      const res = await valuationsRoute.GET(req, makeParams(String(propertyId)));
      const data = await res.json();

      expect(data).toHaveLength(2);
      expect(data[0].date).toBe("2025-06-01");
      expect(data[1].date).toBe("2025-03-01");
    });
  });

  // ── Equity Calculation ────────────────────────────────────────────────

  describe("Equity Calculation", () => {
    let propertyId: number;

    beforeEach(() => {
      const result = insertProperty("Equity Test St", 500000, "2025-01-01", 400000);
      propertyId = Number(result.lastInsertRowid);

      // 3 payments with principal: 300, 350, 400 = 1050 total
      insertPayment(propertyId, "2025-07-01", 2500, 2200, 300);
      insertPayment(propertyId, "2025-08-01", 2500, 2150, 350);
      insertPayment(propertyId, "2025-09-01", 2500, 2100, 400);

      // 2 valuations
      insertValuation(propertyId, "2025-07-15", 510000, "Agent");
      insertValuation(propertyId, "2025-09-15", 520000, "CoreLogic");
    });

    it("calculates equityFromPrincipal correctly", async () => {
      const req = makeRequest(`/api/finance/properties/${propertyId}/equity`);
      const res = await equityRoute.GET(req, makeParams(String(propertyId)));
      const data = await res.json();

      expect(data.equityFromPrincipal).toBe(1050);
    });

    it("calculates loanBalance correctly", async () => {
      const req = makeRequest(`/api/finance/properties/${propertyId}/equity`);
      const res = await equityRoute.GET(req, makeParams(String(propertyId)));
      const data = await res.json();

      expect(data.loanBalance).toBe(400000 - 1050);
    });

    it("calculates equityFromAppreciation correctly", async () => {
      const req = makeRequest(`/api/finance/properties/${propertyId}/equity`);
      const res = await equityRoute.GET(req, makeParams(String(propertyId)));
      const data = await res.json();

      // currentValue is latest valuation = 520000, purchasePrice = 500000
      expect(data.equityFromAppreciation).toBe(520000 - 500000);
    });

    it("generates monthly timeline with step-function valuation", async () => {
      const req = makeRequest(`/api/finance/properties/${propertyId}/equity`);
      const res = await equityRoute.GET(req, makeParams(String(propertyId)));
      const data = await res.json();

      expect(data.monthlyTimeline.length).toBeGreaterThan(0);

      // First month (2025-07) should use purchasePrice initially then valuation
      const julyEntry = data.monthlyTimeline.find(
        (e: { month: string }) => e.month === "2025-07"
      );
      expect(julyEntry).toBeDefined();
      // Valuation on 2025-07-15 is <= 2025-07-31 so it should apply
      expect(julyEntry.estimatedValue).toBe(510000);

      // September entry should use the 520000 valuation
      const sepEntry = data.monthlyTimeline.find(
        (e: { month: string }) => e.month === "2025-09"
      );
      expect(sepEntry).toBeDefined();
      expect(sepEntry.estimatedValue).toBe(520000);
    });
  });
});
