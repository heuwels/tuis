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
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      make TEXT,
      model TEXT,
      year INTEGER,
      colour TEXT,
      rego_number TEXT,
      rego_state TEXT,
      vin TEXT,
      purchase_date TEXT,
      purchase_price REAL,
      current_odometer INTEGER,
      image_url TEXT,
      rego_expiry TEXT,
      insurance_provider TEXT,
      insurance_expiry TEXT,
      warranty_expiry_date TEXT,
      warranty_expiry_km INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS fuel_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      date TEXT NOT NULL,
      odometer INTEGER NOT NULL,
      litres REAL NOT NULL,
      cost_total REAL NOT NULL,
      cost_per_litre REAL,
      station TEXT,
      is_full_tank INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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

function makeRequest(url: string): Request {
  return new Request(`http://localhost${url}`);
}

function insertVehicle(name = "Test Car"): number {
  const result = sqlite
    .prepare("INSERT INTO vehicles (name) VALUES (?)")
    .run(name);
  return Number(result.lastInsertRowid);
}

function insertFuelLog(
  vehicleId: number,
  date: string,
  odometer: number,
  litres: number,
  costTotal: number,
  isFullTank = 1
) {
  const costPerLitre = costTotal / litres;
  sqlite
    .prepare(
      `INSERT INTO fuel_logs (vehicle_id, date, odometer, litres, cost_total, cost_per_litre, is_full_tank)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(vehicleId, date, odometer, litres, costTotal, costPerLitre, isFullTank);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUEL ANALYTICS API
// ═══════════════════════════════════════════════════════════════════════════

describe("Fuel Analytics API", () => {
  let analyticsRoute: typeof import("@/app/api/vehicles/[id]/fuel-analytics/route");

  beforeEach(async () => {
    analyticsRoute = await import(
      "@/app/api/vehicles/[id]/fuel-analytics/route"
    );
  });

  function callGet(vehicleId: number) {
    const req = makeRequest(`/api/vehicles/${vehicleId}/fuel-analytics`);
    return analyticsRoute.GET(req, {
      params: Promise.resolve({ id: vehicleId.toString() }),
    });
  }

  it("returns empty data when fewer than 2 fuel logs", async () => {
    const vId = insertVehicle();
    insertFuelLog(vId, "2026-01-15", 10000, 40, 80);

    const res = await callGet(vId);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.monthlyData).toEqual([]);
    expect(data.keyMetrics).toBeNull();
  });

  it("returns monthly data grouped by month", async () => {
    const vId = insertVehicle();
    insertFuelLog(vId, "2026-01-10", 10000, 40, 80);
    insertFuelLog(vId, "2026-01-25", 10500, 38, 76);
    insertFuelLog(vId, "2026-02-10", 11000, 42, 88.2);

    const res = await callGet(vId);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.monthlyData).toHaveLength(2);
    expect(data.monthlyData[0].month).toBe("2026-01");
    expect(data.monthlyData[1].month).toBe("2026-02");

    // January: 2 fill-ups, total spend = 80 + 76 = 156
    expect(data.monthlyData[0].totalSpend).toBeCloseTo(156);
    // February: 1 fill-up, total spend = 88.2
    expect(data.monthlyData[1].totalSpend).toBeCloseTo(88.2);
  });

  it("calculates average price per litre per month", async () => {
    const vId = insertVehicle();
    // Jan: $2.00/L and $2.10/L → avg $2.05/L
    insertFuelLog(vId, "2026-01-10", 10000, 40, 80); // 80/40 = $2.00/L
    insertFuelLog(vId, "2026-01-25", 10500, 40, 84); // 84/40 = $2.10/L

    const res = await callGet(vId);
    const data = await res.json();

    expect(data.monthlyData[0].avgPricePerLitre).toBeCloseTo(2.05, 2);
  });

  it("calculates distance per month from odometer readings", async () => {
    const vId = insertVehicle();
    insertFuelLog(vId, "2026-01-05", 10000, 40, 80);
    insertFuelLog(vId, "2026-01-20", 10500, 40, 80);
    insertFuelLog(vId, "2026-02-05", 11200, 40, 80);

    const res = await callGet(vId);
    const data = await res.json();

    // Jan: max 10500 - min 10000 = 500 km
    expect(data.monthlyData[0].distanceKm).toBe(500);
    // Feb: single reading, no distance
    expect(data.monthlyData[1].distanceKm).toBeNull();
  });

  it("calculates fuel economy from consecutive full-tank fills", async () => {
    const vId = insertVehicle();
    // First full tank: baseline
    insertFuelLog(vId, "2026-01-05", 10000, 40, 80, 1);
    // Second full tank: 500km on 40L = 8.0 L/100km
    insertFuelLog(vId, "2026-01-20", 10500, 40, 84, 1);

    const res = await callGet(vId);
    const data = await res.json();

    expect(data.monthlyData[0].fuelEconomy).toBeCloseTo(8.0, 1);
  });

  it("skips partial fills for economy calculation", async () => {
    const vId = insertVehicle();
    insertFuelLog(vId, "2026-01-05", 10000, 40, 80, 1); // full - baseline
    insertFuelLog(vId, "2026-01-15", 10300, 20, 42, 0); // partial - skipped
    insertFuelLog(vId, "2026-01-25", 10500, 40, 84, 1); // full - calc from baseline

    const res = await callGet(vId);
    const data = await res.json();

    // Economy: 500km on 40L = 8.0 L/100km (partial fill ignored)
    expect(data.monthlyData[0].fuelEconomy).toBeCloseTo(8.0, 1);
  });

  it("returns key metrics with rolling averages", async () => {
    const vId = insertVehicle();
    // Add multiple logs per month so distance can be calculated
    insertFuelLog(vId, "2026-01-05", 10000, 40, 80);
    insertFuelLog(vId, "2026-01-20", 10400, 38, 79.8);
    insertFuelLog(vId, "2026-02-05", 10800, 42, 88.2);
    insertFuelLog(vId, "2026-02-20", 11200, 41, 90.2);

    const res = await callGet(vId);
    const data = await res.json();

    expect(data.keyMetrics).not.toBeNull();
    expect(data.keyMetrics.allTimePrice).toBeGreaterThan(0);
    expect(data.keyMetrics.avgMonthlyDistance).toBeGreaterThan(0);
  });

  it("returns spend breakdown when current and previous month data exists", async () => {
    const vId = insertVehicle();
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 10);
    const prevMonth = prevDate.toISOString().substring(0, 7);

    insertFuelLog(vId, `${prevMonth}-10`, 10000, 40, 80);
    insertFuelLog(vId, `${currentMonth}-10`, 10500, 45, 99);

    const res = await callGet(vId);
    const data = await res.json();

    expect(data.spendBreakdown).not.toBeNull();
    expect(data.spendBreakdown.currentMonth).toBe(currentMonth);
    expect(data.spendBreakdown.previousMonth).toBe(prevMonth);
    expect(data.spendBreakdown.spendDelta).toBeCloseTo(19);
  });
});
