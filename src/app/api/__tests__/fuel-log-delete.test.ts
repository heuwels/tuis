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

function makeRequest(url: string, method = "DELETE"): Request {
  return new Request(`http://localhost${url}`, { method });
}

function insertVehicle(name = "Test Car"): number {
  const result = sqlite
    .prepare("INSERT INTO vehicles (name) VALUES (?)")
    .run(name);
  return Number(result.lastInsertRowid);
}

function insertFuelLog(vehicleId: number, date = "2026-01-15"): number {
  const result = sqlite
    .prepare(
      `INSERT INTO fuel_logs (vehicle_id, date, odometer, litres, cost_total, cost_per_litre, is_full_tank)
       VALUES (?, ?, 10000, 40, 80, 2.0, 1)`
    )
    .run(vehicleId, date);
  return Number(result.lastInsertRowid);
}

function countFuelLogs(): number {
  const row = sqlite
    .prepare("SELECT COUNT(*) as count FROM fuel_logs")
    .get() as { count: number };
  return row.count;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUEL LOG DELETE API
// ═══════════════════════════════════════════════════════════════════════════

describe("Fuel Log Delete API", () => {
  let fuelRoute: typeof import("@/app/api/vehicles/[id]/fuel/[fuelId]/route");

  beforeEach(async () => {
    fuelRoute = await import("@/app/api/vehicles/[id]/fuel/[fuelId]/route");
  });

  function callDelete(vehicleId: number, fuelId: number) {
    const req = makeRequest(
      `/api/vehicles/${vehicleId}/fuel/${fuelId}`,
      "DELETE"
    );
    return fuelRoute.DELETE(req, {
      params: Promise.resolve({
        id: vehicleId.toString(),
        fuelId: fuelId.toString(),
      }),
    });
  }

  it("deletes a fuel log successfully", async () => {
    const vId = insertVehicle();
    const fuelId = insertFuelLog(vId);
    expect(countFuelLogs()).toBe(1);

    const res = await callDelete(vId, fuelId);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(countFuelLogs()).toBe(0);
  });

  it("returns 404 for non-existent fuel log", async () => {
    const vId = insertVehicle();

    const res = await callDelete(vId, 999);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Fuel log not found");
  });

  it("returns 404 when fuel log belongs to a different vehicle", async () => {
    const vId1 = insertVehicle("Car 1");
    const vId2 = insertVehicle("Car 2");
    const fuelId = insertFuelLog(vId1);

    // Try to delete vehicle 1's fuel log via vehicle 2's route
    const res = await callDelete(vId2, fuelId);
    expect(res.status).toBe(404);
    expect(countFuelLogs()).toBe(1); // Not deleted
  });

  it("only deletes the targeted fuel log", async () => {
    const vId = insertVehicle();
    const fuelId1 = insertFuelLog(vId, "2026-01-10");
    const fuelId2 = insertFuelLog(vId, "2026-01-20");
    const fuelId3 = insertFuelLog(vId, "2026-01-30");
    expect(countFuelLogs()).toBe(3);

    const res = await callDelete(vId, fuelId2);
    expect(res.status).toBe(200);
    expect(countFuelLogs()).toBe(2);

    // Verify the correct log was deleted
    const remaining = sqlite
      .prepare("SELECT id FROM fuel_logs ORDER BY id")
      .all() as { id: number }[];
    expect(remaining.map((r) => r.id)).toEqual([fuelId1, fuelId3]);
  });
});
