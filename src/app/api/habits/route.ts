import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { DEFAULT_TZ, dateKeyInTz } from "@/lib/utils";
import { computeStreak } from "@/lib/streaks";
import type { Habit, HabitLog } from "@/lib/db/types";

export const runtime = "nodejs";

/** What the habits page renders per row: the habit + today's state + streaks. */
export interface HabitView {
  habit: Habit;
  doneToday: boolean;
  currentStreak: number;
  longestStreak: number;
}

/**
 * GET /api/habits (PRD §7.3) — active habits with today's completion + streaks.
 * Log-based: streaks are computed deterministically in streaks.ts from the full
 * habit_logs history (never deleted). "Today" is resolved in the user's TZ.
 * Returns {skipped} with an empty list when Supabase isn't configured.
 */
export const GET = route(async () => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true, habits: [] as HabitView[], todayKey: "" });

  const todayKey = dateKeyInTz(new Date(), DEFAULT_TZ);

  // Fetch active habits + their entire log history in two queries (then join in JS).
  const [{ data: habits, error: hErr }, { data: logs, error: lErr }] = await Promise.all([
    db.from("habits").select("*").eq("active", true).order("name"),
    db.from("habit_logs").select("*"),
  ]);
  if (hErr) throw hErr;
  if (lErr) throw lErr;

  // Bucket log_dates by habit so each streak calc is O(its own logs).
  const byHabit = new Map<string, string[]>();
  for (const log of (logs ?? []) as HabitLog[]) {
    const arr = byHabit.get(log.habit_id) ?? [];
    arr.push(log.log_date);
    byHabit.set(log.habit_id, arr);
  }

  const view: HabitView[] = ((habits ?? []) as Habit[]).map((habit) => {
    const { current, longest, doneToday } = computeStreak(
      byHabit.get(habit.id) ?? [],
      todayKey
    );
    return { habit, doneToday, currentStreak: current, longestStreak: longest };
  });

  return ok({ habits: view, todayKey });
});
