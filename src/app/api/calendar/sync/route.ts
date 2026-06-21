import { ok, fail, route } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { configured } from "@/lib/env";
import { fetchUpcomingEvents } from "@/lib/google-calendar";

// googleapis OAuth client needs the Node runtime (not edge).
export const runtime = "nodejs";

/** Pull the human-readable reason out of a googleapis/Gaxios error. */
function googleErrorDetail(e: unknown): string {
  const err = e as {
    response?: { data?: { error?: { message?: string } | string; error_description?: string } };
    errors?: { message?: string }[];
    message?: string;
  };
  const data = err?.response?.data;
  const fromError =
    typeof data?.error === "string" ? data.error : data?.error?.message;
  return (
    fromError ||
    data?.error_description ||
    err?.errors?.[0]?.message ||
    err?.message ||
    "Google Calendar request failed"
  );
}

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

  let events;
  try {
    events = await fetchUpcomingEvents();
  } catch (e) {
    const detail = googleErrorDetail(e);
    console.error("[PAIOS:calendar/sync] Google error:", detail, e);
    // 502: it's an upstream (Google) failure, not our bug — surface the reason.
    return fail(`Google Calendar: ${detail}`, 502);
  }

  if (events.length === 0) return ok({ synced: 0 });

  const rows = events.map((e) => ({ ...e, synced_at: new Date().toISOString() }));
  const { error } = await db
    .from("calendar_events")
    .upsert(rows, { onConflict: "external_id" });

  if (error) return fail(error.message, 500);
  return ok({ synced: rows.length });
});
