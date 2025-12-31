import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

const dbPath = path.join(process.cwd(), "chore-calendar.db");
const csvPath = path.join(process.cwd(), "Chore Calendar.csv");

function parseCSV(content: string): string[][] {
  const lines = content.split("\n");
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function normalizeDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === "") return null;

  // Handle formats like "2025-12-01" or "2026-1-01"
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1].padStart(2, "0");
    const day = parts[2].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return dateStr;
}

async function seed() {
  console.log("Starting seed...");

  // Check if CSV exists
  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found:", csvPath);
    process.exit(1);
  }

  // Initialize database
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");

  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      area TEXT NOT NULL,
      frequency TEXT NOT NULL,
      assigned_day TEXT,
      season TEXT,
      notes TEXT,
      last_completed TEXT,
      next_due TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );
  `);

  // Check if tasks already exist
  const existingCount = sqlite
    .prepare("SELECT COUNT(*) as count FROM tasks")
    .get() as { count: number };

  if (existingCount.count > 0) {
    console.log(`Database already has ${existingCount.count} tasks. Skipping seed.`);
    sqlite.close();
    return;
  }

  // Read and parse CSV
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvContent);

  // Skip header row, filter empty rows
  const dataRows = rows.slice(1).filter((row) => row[0] && row[0].trim() !== "");

  console.log(`Found ${dataRows.length} tasks to import`);

  // Prepare insert statement
  const insert = sqlite.prepare(`
    INSERT INTO tasks (name, area, frequency, assigned_day, season, notes, last_completed, next_due, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  // Insert tasks
  const insertMany = sqlite.transaction((tasks: string[][]) => {
    for (const row of tasks) {
      const [name, area, frequency, assignedDay, season, notes, lastCompleted, nextDue] = row;

      insert.run(
        name,
        area || "Uncategorized",
        frequency || "Ad-hoc",
        assignedDay || null,
        season || null,
        notes || null,
        normalizeDate(lastCompleted),
        normalizeDate(nextDue)
      );
    }
  });

  insertMany(dataRows);

  console.log(`Successfully imported ${dataRows.length} tasks`);
  sqlite.close();
}

seed().catch(console.error);
