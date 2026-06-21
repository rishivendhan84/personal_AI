import { addDays, startOfDay } from "date-fns";
import { getAdminClient } from "@/lib/db/server";
import { configured } from "@/lib/env";
import type { CalendarEvent } from "@/lib/db/types";
import { PageHeader, SetupHint } from "@/components/ui/page";
import { CalendarStrip } from "@/components/calendar/CalendarStrip";
import { SyncButton } from "@/components/calendar/SyncButton";

/**
 * Calendar (PRD §7.2) — read-only mirror of cached `calendar_events`. Server
 * component fetches the 14-day window directly (no AI); the interactive strip
 * and the manual Sync button are the only client pieces.
 */
export const dynamic = "force-dynamic";

const WINDOW_DAYS = 14;

export default async function CalendarPage() {
  const db = getAdminClient();

  // Window: today → +14 days. Server-computed so the strip's first day is stable.
  const start = startOfDay(new Date());
  const end = addDays(start, WINDOW_DAYS);

  let events: CalendarEvent[] = [];
  if (db) {
    const { data } = await db
      .from("calendar_events")
      .select("*")
      .gte("start_at", start.toISOString())
      .lte("start_at", end.toISOString())
      .order("start_at");
    events = (data ?? []) as CalendarEvent[];
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Calendar"
        description="Your next two weeks, read-only."
        action={<SyncButton />}
      />

      {!db && (
        <SetupHint
          what="Database"
          vars={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]}
        />
      )}

      {/* Hint to wire Google when DB is up but the sync source isn't configured. */}
      {db && !configured.googleCalendar() && (
        <SetupHint
          what="Google Calendar sync"
          vars={["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"]}
        />
      )}

      {/* Strip renders in the browser's local tz, which matches the single
          operator's device (PRD §4 — one user, no multi-tenancy). */}
      <CalendarStrip events={events} startISO={start.toISOString()} days={WINDOW_DAYS} />
    </div>
  );
}
