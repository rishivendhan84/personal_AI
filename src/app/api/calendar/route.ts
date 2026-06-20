import { ok, fail, route } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import type { CalendarEvent } from "@/lib/db/types";

/**
 * GET /api/calendar?from=ISO&to=ISO — cached events in a range (PRD §7.2).
 * Read-only mirror of `calendar_events`; no AI, no Google call. Returns [] when
 * the DB isn't configured so the calendar page still renders its shell.
 */
export const GET = route(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) return fail("from and to query params are required", 400);

  const db = getAdminClient();
  if (!db) return ok({ events: [] as CalendarEvent[] });

  const { data, error } = await db
    .from("calendar_events")
    .select("*")
    .gte("start_at", from)
    .lte("start_at", to)
    .order("start_at");

  if (error) return fail(error.message, 500);
  return ok({ events: (data ?? []) as CalendarEvent[] });
});
