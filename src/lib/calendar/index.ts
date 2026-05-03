import { google } from "googleapis";
import { db } from "@/lib/db";
import {
  googleCalendarSettings,
  taskCalendarEvents,
  tasks,
  Task,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Frequencies that should sync to Google Calendar
const SYNCABLE_FREQUENCIES = [
  "Bi-Weekly",
  "Monthly",
  "Quarterly",
  "Bi-Annually",
  "Annual",
];

export function isSyncableFrequency(frequency: string): boolean {
  return SYNCABLE_FREQUENCIES.some(
    (f) => f.toLowerCase() === frequency.toLowerCase()
  );
}

export interface CalendarSyncResult {
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}

async function getCalendarSettings() {
  const settings = await db
    .select()
    .from(googleCalendarSettings)
    .limit(1);
  return settings[0] || null;
}

async function getValidAccessToken(): Promise<string | null> {
  const settings = await getCalendarSettings();
  if (!settings) return null;

  const { accessToken, refreshToken, tokenExpiry, id } = settings;

  // Check if token expires within 5 minutes
  if (new Date(tokenExpiry) <= new Date(Date.now() + 5 * 60 * 1000)) {
    // Refresh the token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update stored tokens
      await db
        .update(googleCalendarSettings)
        .set({
          accessToken: credentials.access_token!,
          tokenExpiry: new Date(credentials.expiry_date!).toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(googleCalendarSettings.id, id));

      return credentials.access_token!;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      return null;
    }
  }

  return accessToken;
}

function getCalendarClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function createCalendarEvent(
  task: Task,
  dueDate: string
): Promise<string | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  const settings = await getCalendarSettings();
  if (!settings?.syncEnabled) return null;

  const calendar = getCalendarClient(accessToken);
  const calendarId = settings.calendarId || "primary";

  try {
    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `[Chore] ${task.name}`,
        description: `Area: ${task.area}\nFrequency: ${task.frequency}${task.notes ? `\n\n${task.notes}` : ""}`,
        start: { date: dueDate },
        end: { date: dueDate },
        reminders: { useDefault: false, overrides: [] },
      },
    });

    return response.data.id || null;
  } catch (error) {
    console.error("Failed to create calendar event:", error);
    return null;
  }
}

export async function updateCalendarEvent(
  eventId: string,
  task: Task,
  dueDate: string
): Promise<boolean> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return false;

  const settings = await getCalendarSettings();
  if (!settings) return false;

  const calendar = getCalendarClient(accessToken);
  const calendarId = settings.calendarId || "primary";

  try {
    await calendar.events.update({
      calendarId,
      eventId,
      requestBody: {
        summary: `[Chore] ${task.name}`,
        description: `Area: ${task.area}\nFrequency: ${task.frequency}${task.notes ? `\n\n${task.notes}` : ""}`,
        start: { date: dueDate },
        end: { date: dueDate },
      },
    });
    return true;
  } catch (error) {
    console.error("Failed to update calendar event:", error);
    return false;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return false;

  const settings = await getCalendarSettings();
  if (!settings) return false;

  const calendar = getCalendarClient(accessToken);
  const calendarId = settings.calendarId || "primary";

  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
    return true;
  } catch (error) {
    console.error("Failed to delete calendar event:", error);
    return false;
  }
}

export async function syncTask(task: Task): Promise<void> {
  // Only sync tasks with syncable frequencies and a next due date
  if (!isSyncableFrequency(task.frequency) || !task.nextDue) {
    return;
  }

  const settings = await getCalendarSettings();
  if (!settings?.syncEnabled) return;

  // Check if we already have an event for this task
  const existingEvents = await db
    .select()
    .from(taskCalendarEvents)
    .where(eq(taskCalendarEvents.taskId, task.id));

  const existingEvent = existingEvents[0];

  if (existingEvent) {
    // Event exists - check if date changed
    if (existingEvent.eventDate !== task.nextDue) {
      // Update the event with new date
      const updated = await updateCalendarEvent(
        existingEvent.googleEventId,
        task,
        task.nextDue
      );
      if (updated) {
        await db
          .update(taskCalendarEvents)
          .set({
            eventDate: task.nextDue,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(taskCalendarEvents.id, existingEvent.id));
      }
    }
  } else {
    // No event exists - create one
    const eventId = await createCalendarEvent(task, task.nextDue);
    if (eventId) {
      await db.insert(taskCalendarEvents).values({
        taskId: task.id,
        googleEventId: eventId,
        eventDate: task.nextDue,
      });
    }
  }
}

export async function deleteTaskCalendarEvents(taskId: number): Promise<void> {
  const events = await db
    .select()
    .from(taskCalendarEvents)
    .where(eq(taskCalendarEvents.taskId, taskId));

  for (const event of events) {
    await deleteCalendarEvent(event.googleEventId);
  }

  await db
    .delete(taskCalendarEvents)
    .where(eq(taskCalendarEvents.taskId, taskId));
}

export async function syncAllTasks(): Promise<CalendarSyncResult> {
  const result: CalendarSyncResult = {
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
  };

  const settings = await getCalendarSettings();
  if (!settings?.syncEnabled) {
    result.errors.push("Calendar sync is not enabled");
    return result;
  }

  // Get all tasks
  const allTasks = await db.select().from(tasks);

  // Get all existing calendar events
  const existingEvents = await db.select().from(taskCalendarEvents);
  const eventsByTaskId = new Map(existingEvents.map((e) => [e.taskId, e]));

  for (const task of allTasks) {
    const shouldSync = isSyncableFrequency(task.frequency) && task.nextDue;
    const existingEvent = eventsByTaskId.get(task.id);

    try {
      if (shouldSync) {
        if (existingEvent) {
          // Update if date changed
          if (existingEvent.eventDate !== task.nextDue) {
            const updated = await updateCalendarEvent(
              existingEvent.googleEventId,
              task,
              task.nextDue!
            );
            if (updated) {
              await db
                .update(taskCalendarEvents)
                .set({
                  eventDate: task.nextDue!,
                  updatedAt: new Date().toISOString(),
                })
                .where(eq(taskCalendarEvents.id, existingEvent.id));
              result.updated++;
            }
          }
        } else {
          // Create new event
          const eventId = await createCalendarEvent(task, task.nextDue!);
          if (eventId) {
            await db.insert(taskCalendarEvents).values({
              taskId: task.id,
              googleEventId: eventId,
              eventDate: task.nextDue!,
            });
            result.created++;
          }
        }
      } else if (existingEvent) {
        // Task no longer syncable or has no due date - delete event
        const deleted = await deleteCalendarEvent(existingEvent.googleEventId);
        if (deleted) {
          await db
            .delete(taskCalendarEvents)
            .where(eq(taskCalendarEvents.id, existingEvent.id));
          result.deleted++;
        }
      }
    } catch (error) {
      result.errors.push(`Failed to sync task "${task.name}": ${error}`);
    }
  }

  // Clean up orphaned events (events for deleted tasks)
  const taskIds = new Set(allTasks.map((t) => t.id));
  for (const event of existingEvents) {
    if (!taskIds.has(event.taskId)) {
      try {
        await deleteCalendarEvent(event.googleEventId);
        await db
          .delete(taskCalendarEvents)
          .where(eq(taskCalendarEvents.id, event.id));
        result.deleted++;
      } catch (error) {
        result.errors.push(`Failed to clean up orphaned event: ${error}`);
      }
    }
  }

  return result;
}

export async function getConnectionStatus() {
  const settings = await getCalendarSettings();
  if (!settings) {
    return { connected: false };
  }

  const eventCount = await db
    .select()
    .from(taskCalendarEvents);

  return {
    connected: true,
    email: settings.connectedEmail,
    syncEnabled: settings.syncEnabled,
    calendarId: settings.calendarId || "primary",
    eventCount: eventCount.length,
    lastUpdated: settings.updatedAt,
  };
}

export async function disconnectCalendar(): Promise<void> {
  // Delete all calendar events from Google Calendar
  const events = await db.select().from(taskCalendarEvents);
  for (const event of events) {
    await deleteCalendarEvent(event.googleEventId);
  }

  // Clear local data
  await db.delete(taskCalendarEvents);
  await db.delete(googleCalendarSettings);
}

export async function toggleSync(enabled: boolean): Promise<void> {
  await db
    .update(googleCalendarSettings)
    .set({
      syncEnabled: enabled,
      updatedAt: new Date().toISOString(),
    });
}

export interface CalendarListItem {
  id: string;
  summary: string;
  primary?: boolean;
}

export async function getAvailableCalendars(): Promise<CalendarListItem[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return [];

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    const response = await calendar.calendarList.list({
      minAccessRole: "writer", // Only calendars we can write to
    });

    return (response.data.items || []).map((cal) => ({
      id: cal.id!,
      summary: cal.summary!,
      primary: cal.primary || false,
    }));
  } catch (error) {
    console.error("Failed to fetch calendars:", error);
    return [];
  }
}

export async function setCalendarId(calendarId: string): Promise<void> {
  await db
    .update(googleCalendarSettings)
    .set({
      calendarId,
      updatedAt: new Date().toISOString(),
    });
}
