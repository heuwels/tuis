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

export const googleCalendarSettings = sqliteTable("google_calendar_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: text("token_expiry").notNull(),
  calendarId: text("calendar_id").default("primary"),
  connectedEmail: text("connected_email").notNull(),
  syncEnabled: integer("sync_enabled", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const taskCalendarEvents = sqliteTable("task_calendar_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id),
  googleEventId: text("google_event_id").notNull(),
  eventDate: text("event_date").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Completion = typeof completions.$inferSelect;
export type NewCompletion = typeof completions.$inferInsert;
export type GoogleCalendarSettings = typeof googleCalendarSettings.$inferSelect;
export type NewGoogleCalendarSettings = typeof googleCalendarSettings.$inferInsert;
export type TaskCalendarEvent = typeof taskCalendarEvents.$inferSelect;
export type NewTaskCalendarEvent = typeof taskCalendarEvents.$inferInsert;
