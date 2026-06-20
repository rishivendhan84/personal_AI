import "server-only";
import { google } from "googleapis";
import { addDays } from "date-fns";
import { env, configured } from "@/lib/env";

/**
 * Google Calendar client (server-only, env-gated, PRD §7.2). Read-only: we only
 * LIST events to mirror them into `calendar_events`. Never crashes when keys are
 * missing — `fetchUpcomingEvents` returns [] so the sync route degrades cleanly.
 *
 * Lazy fallback (not implemented): if OAuth is too much friction, a public iCal
 * URL could be parsed instead. Left as a deliberate future option per §7.2.
 */

/** Shape upserted into `calendar_events` (subset of CalendarEvent we own). */
export interface CalendarEventInput {
  external_id: string;
  title: string;
  start_at: string; // ISO
  end_at: string | null; // ISO or null (all-day handled below)
  location: string | null;
}

/** Build an OAuth2 client from refresh-token creds. */
function makeClient() {
  const oauth2 = new google.auth.OAuth2(
    env("GOOGLE_CLIENT_ID"),
    env("GOOGLE_CLIENT_SECRET"),
    env("GOOGLE_REDIRECT_URI") // optional; unused for refresh-token flow
  );
  oauth2.setCredentials({ refresh_token: env("GOOGLE_REFRESH_TOKEN") });
  return google.calendar({ version: "v3", auth: oauth2 });
}

/**
 * Fetch the next ~14 days of events from GOOGLE_CALENDAR_ID (default 'primary').
 * Returns [] when Google isn't configured so callers never special-case errors.
 */
export async function fetchUpcomingEvents(): Promise<CalendarEventInput[]> {
  if (!configured.googleCalendar()) return [];

  const calendar = makeClient();
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = addDays(now, 14).toISOString();

  const { data } = await calendar.events.list({
    calendarId: env("GOOGLE_CALENDAR_ID") ?? "primary",
    timeMin,
    timeMax,
    singleEvents: true, // expand recurring into individual instances
    orderBy: "startTime",
    maxResults: 250,
  });

  return (data.items ?? [])
    .map((e): CalendarEventInput | null => {
      // start/end carry either dateTime (timed) or date (all-day).
      const start = e.start?.dateTime ?? e.start?.date;
      if (!e.id || !start) return null; // skip malformed entries
      const end = e.end?.dateTime ?? e.end?.date ?? null;
      return {
        external_id: e.id,
        title: e.summary?.trim() || "(no title)",
        start_at: new Date(start).toISOString(),
        end_at: end ? new Date(end).toISOString() : null,
        location: e.location ?? null,
      };
    })
    .filter((e): e is CalendarEventInput => e !== null);
}
