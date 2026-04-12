import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import { parseQuantityString } from "../ingredients";

// Use /app/data in Docker, otherwise current directory
function getDbPath() {
  const dataDir = fs.existsSync("/app/data") ? "/app/data" : process.cwd();
  return path.join(dataDir, "chore-calendar.db");
}

// Lazy initialization - only connect when needed (not at build time)
let _db: BetterSQLite3Database<typeof schema> | null = null;

function initDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;

  const dbPath = getDbPath();
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");

  // Initialize tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      area TEXT NOT NULL,
      frequency TEXT NOT NULL,
      assigned_day TEXT,
      season TEXT,
      notes TEXT,
      assigned_to INTEGER REFERENCES users(id),
      last_completed TEXT,
      next_due TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      completed_by INTEGER REFERENCES users(id),
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS google_calendar_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_expiry TEXT NOT NULL,
      calendar_id TEXT DEFAULT 'primary',
      connected_email TEXT NOT NULL,
      sync_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS task_calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      google_event_id TEXT NOT NULL,
      event_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shopping_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3b82f6',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity TEXT,
      checked INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      added_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS item_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      use_count INTEGER DEFAULT 1,
      last_used TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      instructions TEXT,
      prep_time INTEGER,
      cook_time INTEGER,
      servings INTEGER,
      image_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meal_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      recipe_id INTEGER REFERENCES recipes(id),
      custom_meal TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'wishlist',
      completed_date TEXT,
      rating INTEGER,
      url TEXT,
      location TEXT,
      estimated_cost TEXT,
      duration TEXT,
      season TEXT,
      priority TEXT DEFAULT 'medium',
      tags TEXT,
      review TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appliances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      brand TEXT,
      model TEXT,
      purchase_date TEXT,
      warranty_expiry TEXT,
      manual_url TEXT,
      warranty_doc_url TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      notes TEXT,
      rating INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER REFERENCES vendors(id),
      description TEXT NOT NULL,
      total REAL NOT NULL,
      labor REAL,
      materials REAL,
      other REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      received_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS vehicle_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      date TEXT NOT NULL,
      odometer INTEGER,
      vendor_id INTEGER REFERENCES vendors(id),
      cost REAL,
      description TEXT NOT NULL,
      service_type TEXT,
      receipt_url TEXT,
      is_diy INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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

  // Add new columns if they don't exist (migrations for existing databases)
  try {
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN assigned_to INTEGER REFERENCES users(id)`);
  } catch { /* column already exists */ }

  try {
    sqlite.exec(`ALTER TABLE completions ADD COLUMN completed_by INTEGER REFERENCES users(id)`);
  } catch { /* column already exists */ }

  try {
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN appliance_id INTEGER REFERENCES appliances(id)`);
  } catch { /* column already exists */ }

  try {
    sqlite.exec(`ALTER TABLE completions ADD COLUMN vendor_id INTEGER REFERENCES vendors(id)`);
  } catch { /* column already exists */ }

  try {
    sqlite.exec(`ALTER TABLE completions ADD COLUMN cost TEXT`);
  } catch { /* column already exists */ }

  // Task extended notes
  try {
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN extended_notes TEXT`);
  } catch { /* column already exists */ }

  // Meal plan servings multiplier
  try {
    sqlite.exec(`ALTER TABLE meal_plan ADD COLUMN servings_multiplier REAL DEFAULT 1`);
  } catch { /* column already exists */ }

  // Recipe ingredient structured fields
  try {
    sqlite.exec(`ALTER TABLE recipe_ingredients ADD COLUMN amount REAL`);
  } catch { /* column already exists */ }

  try {
    sqlite.exec(`ALTER TABLE recipe_ingredients ADD COLUMN unit TEXT`);
  } catch { /* column already exists */ }

  try {
    sqlite.exec(`ALTER TABLE recipe_ingredients ADD COLUMN section TEXT`);
  } catch { /* column already exists */ }

  // Migrate legacy quantity strings to structured amount+unit
  migrateLegacyQuantities(sqlite);

  _db = drizzle(sqlite, { schema });
  return _db;
}

// Export a getter that lazily initializes
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_, prop) {
    const realDb = initDb();
    return (realDb as unknown as Record<string | symbol, unknown>)[prop];
  },
});

function migrateLegacyQuantities(sqlite: Database.Database) {
  // Only migrate rows that have quantity but no amount
  const rows = sqlite
    .prepare(
      `SELECT id, quantity FROM recipe_ingredients WHERE quantity IS NOT NULL AND amount IS NULL`
    )
    .all() as { id: number; quantity: string }[];

  if (rows.length === 0) return;

  const update = sqlite.prepare(
    `UPDATE recipe_ingredients SET amount = ?, unit = ? WHERE id = ?`
  );

  const tx = sqlite.transaction(() => {
    for (const row of rows) {
      const parsed = parseQuantityString(row.quantity);
      if (parsed) {
        update.run(parsed.amount, parsed.unit, row.id);
      }
    }
  });

  tx();
}

export { schema };
