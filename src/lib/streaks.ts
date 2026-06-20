// Deterministic streak computation from habit_logs (PRD §7.3).
// Pure functions, no AI, no DB — given a habit's log_date strings, produce the
// current and longest consecutive-day streaks. History is never mutated here;
// we only read it. Kept side-effect free so it's trivially testable and the same
// input always yields the same numbers.

import { addDays } from "date-fns";

/** A YYYY-MM-DD date key (matches habit_logs.log_date and dateKeyInTz output). */
export type DateKey = string;

export interface StreakResult {
  /** Consecutive days ending today (or yesterday) up to and including today. */
  current: number;
  /** Longest consecutive run anywhere in the history. */
  longest: number;
  /** Whether there's a log for `todayKey` (drives the toggle's done state). */
  doneToday: boolean;
}

/** Parse a YYYY-MM-DD key as a *local* date (no TZ math — keys are already TZ-resolved). */
function parseKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Day key for a Date in the same local frame parseKey uses, so addDays lines up. */
function toKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Compute streaks for one habit.
 *
 * @param logDates  the habit's log_date values (any order, dupes tolerated).
 * @param todayKey  today's date key in the user's TZ (dateKeyInTz(new Date(), tz)).
 *
 * "current" allows the run to end *yesterday* as well as today — a not-yet-logged
 * today shouldn't visually reset a live streak before the day is over.
 */
export function computeStreak(logDates: DateKey[], todayKey: DateKey): StreakResult {
  // Dedupe + sort ascending so consecutive-day logic is a simple linear scan.
  const unique = Array.from(new Set(logDates)).sort();
  if (unique.length === 0) return { current: 0, longest: 0, doneToday: false };

  const haveDay = new Set(unique);
  const doneToday = haveDay.has(todayKey);

  // --- longest: scan sorted keys, counting consecutive-day runs ---
  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    const prevPlusOne = toKey(addDays(parseKey(unique[i - 1]), 1));
    run = unique[i] === prevPlusOne ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // --- current: walk backwards from today (or yesterday) while days are present ---
  const today = parseKey(todayKey);
  const yesterdayKey = toKey(addDays(today, -1));
  let cursor: Date;
  if (doneToday) cursor = today;
  else if (haveDay.has(yesterdayKey)) cursor = addDays(today, -1);
  else return { current: 0, longest, doneToday };

  let current = 0;
  while (haveDay.has(toKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }

  return { current, longest, doneToday };
}
