import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

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
  `);

  // Add new columns if they don't exist (migrations for existing databases)
  try {
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN assigned_to INTEGER REFERENCES users(id)`);
  } catch { /* column already exists */ }

  try {
    sqlite.exec(`ALTER TABLE completions ADD COLUMN completed_by INTEGER REFERENCES users(id)`);
  } catch { /* column already exists */ }

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

export { schema };
