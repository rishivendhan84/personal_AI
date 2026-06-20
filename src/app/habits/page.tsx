import { getAdminClient } from "@/lib/db/server";
import { DEFAULT_TZ, dateKeyInTz } from "@/lib/utils";
import { computeStreak } from "@/lib/streaks";
import { PageHeader, SetupHint } from "@/components/ui/page";
import { HabitGrid } from "@/components/habits/HabitGrid";
import type { Habit, HabitLog } from "@/lib/db/types";
import type { HabitView } from "@/app/api/habits/route";

// Always render fresh — today's completion state must not be cached.
export const dynamic = "force-dynamic";

/**
 * Habits page (PRD §7.3). Server component fetches the initial habit view (same
 * shape /api/habits returns) so the grid paints instantly; the client grid then
 * takes over for toggles + realtime sync. Degrades to a SetupHint without Supabase.
 */
export default async function HabitsPage() {
  const db = getAdminClient();

  if (!db) {
    return (
      <>
        <PageHeader
          title="Habits"
          description="One-tap daily habits with streaks."
        />
        <SetupHint
          what="Habits"
          vars={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]}
        />
      </>
    );
  }

  const todayKey = dateKeyInTz(new Date(), DEFAULT_TZ);
  const [{ data: habits }, { data: logs }] = await Promise.all([
    db.from("habits").select("*").eq("active", true).order("name"),
    db.from("habit_logs").select("*"),
  ]);

  // Bucket log_dates per habit, then compute streaks deterministically.
  const byHabit = new Map<string, string[]>();
  for (const log of (logs ?? []) as HabitLog[]) {
    const arr = byHabit.get(log.habit_id) ?? [];
    arr.push(log.log_date);
    byHabit.set(log.habit_id, arr);
  }

  const initial: HabitView[] = ((habits ?? []) as Habit[]).map((habit) => {
    const { current, longest, doneToday } = computeStreak(
      byHabit.get(habit.id) ?? [],
      todayKey
    );
    return { habit, doneToday, currentStreak: current, longestStreak: longest };
  });

  const doneCount = initial.filter((h) => h.doneToday).length;
  const total = initial.length;
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: DEFAULT_TZ,
  });

  return (
    <>
      <PageHeader
        title="Habits"
        description="One-tap daily habits with streaks."
        action={
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{dateLabel}</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
              <span className={doneCount === total && total > 0 ? "text-violet" : "text-foreground"}>
                {doneCount}
              </span>
              <span className="text-muted-foreground">/{total}</span>{" "}
              <span className="text-sm font-normal text-muted-foreground">done today</span>
            </p>
          </div>
        }
      />
      <HabitGrid initial={initial} />
    </>
  );
}
