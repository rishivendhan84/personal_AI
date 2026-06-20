import { ok, fail, route } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { configured } from "@/lib/env";
import { fetchUpcomingEvents } from "@/lib/google-calendar";

// googleapis OAuth client needs the Node runtime (not edge).
export const runtime = "nodejs";

/**
 * POST /api/calendar/sync — manual refresh (PRD §7.2). Pulls the next ~14 days
 * from Google Calendar and upserts into `calendar_events` keyed on external_id.
 * No AI. Env-gated: skips cleanly when Google or Supabase isn't configured.
 */
export const POST = route(async () => {
  if (!configured.googleCalendar()) {
    return ok({ skipped: "Google Calendar not configured" });
  }
  const db = getAdminClient();
  if (!db) return ok({ skipped: "db not configured" });

  const events = await fetchUpcomingEvents();
  if (events.length === 0) return ok({ synced: 0 });

  const rows = events.map((e) => ({ ...e, synced_at: new Date().toISOString() }));
  const { error } = await db
    .from("calendar_events")
    .upsert(rows, { onConflict: "external_id" });

  if (error) return fail(error.message, 500);
  return ok({ synced: rows.length });
});
