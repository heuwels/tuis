"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, RefreshCw, Unplug, Check, X } from "lucide-react";

interface CalendarListItem {
  id: string;
  summary: string;
  primary?: boolean;
}

interface CalendarStatus {
  connected: boolean;
  email?: string;
  syncEnabled?: boolean;
  calendarId?: string;
  eventCount?: number;
  lastUpdated?: string;
  calendars?: CalendarListItem[];
}

interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}

export function GoogleCalendarCard() {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

  const fetchStatus = async (includeCalendars = false) => {
    try {
      const url = includeCalendars
        ? "/api/calendar/settings?calendars=true"
        : "/api/calendar/settings";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Error fetching calendar status:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingCalendars(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = () => {
    signIn("google", { callbackUrl: "/settings" });
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google Calendar? This will remove all synced events.")) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const response = await fetch("/api/calendar/settings", {
        method: "DELETE",
      });
      if (response.ok) {
        setStatus({ connected: false });
        setSyncResult(null);
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/calendar/sync", {
        method: "POST",
      });
      if (response.ok) {
        const result = await response.json();
        setSyncResult(result);
        fetchStatus();
      }
    } catch (error) {
      console.error("Error syncing:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleSync = async () => {
    try {
      const response = await fetch("/api/calendar/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncEnabled: !status?.syncEnabled }),
      });
      if (response.ok) {
        const data = await response.json();
        setStatus((prev) => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("Error toggling sync:", error);
    }
  };

  const handleCalendarChange = async (calendarId: string) => {
    try {
      const response = await fetch("/api/calendar/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId }),
      });
      if (response.ok) {
        const data = await response.json();
        setStatus((prev) => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("Error changing calendar:", error);
    }
  };

  const handleLoadCalendars = () => {
    setIsLoadingCalendars(true);
    fetchStatus(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected ? (
          <>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  Connected as <strong>{status.email}</strong>
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                <Unplug className="h-4 w-4 mr-1" />
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Calendar</p>
                  <p className="text-xs text-muted-foreground">
                    Select which calendar to sync events to
                  </p>
                </div>
                {!status.calendars && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLoadCalendars}
                    disabled={isLoadingCalendars}
                  >
                    {isLoadingCalendars ? "Loading..." : "Change"}
                  </Button>
                )}
              </div>
              {status.calendars && (
                <Select
                  value={status.calendarId || "primary"}
                  onValueChange={handleCalendarChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {status.calendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        {cal.summary}
                        {cal.primary && " (Primary)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-sync</p>
                <p className="text-xs text-muted-foreground">
                  Sync bi-weekly+ tasks automatically
                </p>
              </div>
              <Button
                size="sm"
                variant={status.syncEnabled ? "default" : "outline"}
                onClick={handleToggleSync}
              >
                {status.syncEnabled ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Synced events</p>
                <p className="text-xs text-muted-foreground">
                  {status.eventCount || 0} tasks synced to calendar
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            </div>

            {syncResult && (
              <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm">
                <p className="font-medium mb-1">Sync complete</p>
                <ul className="text-muted-foreground space-y-1">
                  {syncResult.created > 0 && (
                    <li>Created: {syncResult.created} events</li>
                  )}
                  {syncResult.updated > 0 && (
                    <li>Updated: {syncResult.updated} events</li>
                  )}
                  {syncResult.deleted > 0 && (
                    <li>Deleted: {syncResult.deleted} events</li>
                  )}
                  {syncResult.created === 0 &&
                    syncResult.updated === 0 &&
                    syncResult.deleted === 0 && (
                      <li>Everything is up to date</li>
                    )}
                  {syncResult.errors.length > 0 && (
                    <li className="text-red-600">
                      Errors: {syncResult.errors.length}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <X className="h-4 w-4" />
              <span>Not connected</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Connect your Google Calendar to sync task due dates for bi-weekly,
              monthly, quarterly, and annual tasks.
            </p>
            <Button onClick={handleConnect}>
              <Calendar className="h-4 w-4 mr-2" />
              Connect Google Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
