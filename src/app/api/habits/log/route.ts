import { route, ok, fail } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { DEFAULT_TZ, dateKeyInTz } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * POST /api/habits/log (PRD §7.3) — toggle today's completion for one habit.
 *
 * Log-based, history-preserving:
 *  - Completing  → INSERT a habit_logs row for (habit_id, today). The unique
 *    (habit_id, log_date) constraint makes this idempotent.
 *  - Un-completing → DELETE *only* today's row. Past logs are never touched, so
 *    streaks stay intact.
 *
 * "Today" = dateKeyInTz(now, user TZ) — the midnight reset is just this filter.
 * Body: { habitId: string, done: boolean }.
 */
export const POST = route(async (req: Request) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });

  const body = (await req.json()) as { habitId?: string; done?: boolean };
  if (!body.habitId) return fail("habitId is required", 400);

  const logDate = dateKeyInTz(new Date(), DEFAULT_TZ);

  if (body.done) {
    // Upsert on the unique constraint → re-completing the same day is a no-op.
    const { error } = await db
      .from("habit_logs")
      .upsert(
        { habit_id: body.habitId, log_date: logDate },
        { onConflict: "habit_id,log_date", ignoreDuplicates: true }
      );
    if (error) throw error;
    return ok({ habitId: body.habitId, logDate, done: true });
  }

  // Toggle off: delete today's row only (never historical logs).
  const { error } = await db
    .from("habit_logs")
    .delete()
    .eq("habit_id", body.habitId)
    .eq("log_date", logDate);
  if (error) throw error;
  return ok({ habitId: body.habitId, logDate, done: false });
});
