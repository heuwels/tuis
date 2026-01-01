import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3b82f6"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  area: text("area").notNull(),
  frequency: text("frequency").notNull(),
  assignedDay: text("assigned_day"),
  season: text("season"),
  notes: text("notes"),
  assignedTo: integer("assigned_to").references(() => users.id),
  lastCompleted: text("last_completed"),
  nextDue: text("next_due"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const completions = sqliteTable("completions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id),
  completedAt: text("completed_at").notNull(),
  completedBy: integer("completed_by").references(() => users.id),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Completion = typeof completions.$inferSelect;
export type NewCompletion = typeof completions.$inferInsert;
