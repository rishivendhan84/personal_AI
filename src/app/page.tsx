import { CalendarClock } from "lucide-react";
import { getLatestBrief } from "@/lib/brief";
import { getAdminClient } from "@/lib/db/server";
import { USER_ID, DEFAULT_TZ, dateKeyInTz } from "@/lib/utils";
import { computeStreak } from "@/lib/streaks";
import { URGENCY_ORDER } from "@/lib/ui";
import type {
  User,
  CalendarEvent,
  Task,
  TaskUrgency,
  HabitLog,
  FinanceSnapshot,
} from "@/lib/db/types";
import { SetupHint } from "@/components/ui/page";
import { BentoGrid } from "@/components/dashboard/BentoGrid";
import { OperatorHero } from "@/components/dashboard/OperatorHero";
import {
  TasksTile,
  HabitsTile,
  CalendarTile,
  GoalsTile,
  FinanceTile,
  NutritionTile,
  BriefBanner,
} from "@/components/dashboard/BentoTiles";
import { GenerateBriefButton } from "@/components/dashboard/GenerateBriefButton";
import { BentoCard } from "@/components/ui/bento-card";

/**
 * Operator Dashboard (PRD §7.1) — a premium dark bento grid. The hero card leads
 * and dominates (2×2); compact tiles summarize each surface. Server component:
 * reads the *cached* brief + snapshots directly and NEVER calls AI on load.
 */
export const dynamic = "force-dynamic"; // always reflect the latest cached brief

type Db = NonNullable<ReturnType<typeof getAdminClient>>;

export default async function DashboardPage() {
  const db = getAdminClient();

  // No DB → graceful empty hero + setup hint instead of crashing.
  if (!db) {
    return (
      <div className="space-y-4">
        <BentoGrid>
          <BentoCard glow span="md:col-span-2 md:row-span-2">
            <h1 className="font-serif text-4xl leading-tight tracking-tight">
              Welcome to PAIOS
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Connect Supabase to activate your Operator console.
            </p>
          </BentoCard>
        </BentoGrid>
        <SetupHint
          what="PAIOS"
          vars={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]}
        />
      </div>
    );
  }

  const userRes = await db.from("users").select("*").eq("id", USER_ID).maybeSingle<User>();
  const user = userRes.data;
  const tz = user?.timezone ?? DEFAULT_TZ;
  const todayKey = dateKeyInTz(new Date(), tz);

  const [brief, events, taskCounts, tasksDoneToday, bestStreak, netWorth, nutrition] =
    await Promise.all([
      getLatestBrief(),
      todayEvents(db, todayKey),
      openTaskCounts(db),
      tasksDoneTodayCount(db, todayKey),
      bestStreakAcrossHabits(db, todayKey),
      latestNetWorth(db),
      todayNutrition(db, todayKey),
    ]);

  const name = user?.name?.split(" ")[0] ?? "Operator";

  if (!brief) {
    return (
      <div className="space-y-4">
        <BentoGrid>
          <BentoCard glow span="md:col-span-2 md:row-span-2">
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <CalendarClock className="h-8 w-8 text-violet" />
              <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight">
                No brief yet today
              </h1>
              <p className="mb-6 mt-2 max-w-sm text-sm text-muted-foreground">
                Generate your daily brief to see your focus, priorities, and schedule.
              </p>
              <GenerateBriefButton />
            </div>
          </BentoCard>
          <CalendarTile calendar={[]} timeZone={tz} />
          <FinanceTile netWorth={netWorth} />
          <NutritionTile calories={nutrition.calories} target={nutrition.target} />
        </BentoGrid>
      </div>
    );
  }

  const c = brief.content;

  return (
    <div className="space-y-4">
      {c.focus && <BriefBanner focus={c.focus} />}

      <BentoGrid>
        <OperatorHero
          name={name}
          focus={user?.current_focus ?? null}
          location={user?.current_location ?? null}
          timeZone={tz}
          top3={c.top3}
          calendar={c.calendar}
          habits={c.habits}
          tasksDoneToday={tasksDoneToday}
          bestStreak={bestStreak}
        />
        <TasksTile counts={taskCounts} />
        <HabitsTile habits={c.habits} bestStreak={bestStreak} />
        <CalendarTile calendar={c.calendar} timeZone={tz} />
        <GoalsTile goals={c.goal_progress} />
        <FinanceTile netWorth={netWorth} />
        <NutritionTile calories={nutrition.calories} target={nutrition.target} />
      </BentoGrid>
    </div>
  );
}

/** Today's events in the user's tz, straight from the cache. */
async function todayEvents(db: Db, todayKey: string): Promise<CalendarEvent[]> {
  const { data } = await db
    .from("calendar_events")
    .select("*")
    .gte("start_at", `${todayKey}T00:00:00`)
    .lte("start_at", `${todayKey}T23:59:59`)
    .order("start_at");
  return (data ?? []) as CalendarEvent[];
}

/** Open tasks bucketed by urgency tier. */
async function openTaskCounts(db: Db): Promise<Record<TaskUrgency, number>> {
  const counts = { today: 0, week: 0, month: 0, someday: 0 } as Record<TaskUrgency, number>;
  const { data } = await db.from("tasks").select("urgency").neq("status", "done");
  for (const t of (data ?? []) as Pick<Task, "urgency">[]) {
    if (URGENCY_ORDER.includes(t.urgency)) counts[t.urgency] += 1;
  }
  return counts;
}

/** Count of tasks completed today (in the user's tz window). */
async function tasksDoneTodayCount(db: Db, todayKey: string): Promise<number> {
  const { count } = await db
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("status", "done")
    .gte("completed_at", `${todayKey}T00:00:00`)
    .lte("completed_at", `${todayKey}T23:59:59`);
  return count ?? 0;
}

/** Best (longest) streak across all habits, from habit_logs history. */
async function bestStreakAcrossHabits(db: Db, todayKey: string): Promise<number> {
  const { data } = await db.from("habit_logs").select("habit_id, log_date");
  const byHabit = new Map<string, string[]>();
  for (const l of (data ?? []) as Pick<HabitLog, "habit_id" | "log_date">[]) {
    const arr = byHabit.get(l.habit_id) ?? [];
    arr.push(l.log_date);
    byHabit.set(l.habit_id, arr);
  }
  let best = 0;
  for (const dates of byHabit.values()) {
    const { longest } = computeStreak(dates, todayKey);
    if (longest > best) best = longest;
  }
  return best;
}

/** Latest finance snapshot's net worth, or null. */
async function latestNetWorth(db: Db): Promise<number | null> {
  const { data } = await db
    .from("finance_snapshots")
    .select("net_worth")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<FinanceSnapshot, "net_worth">>();
  return data?.net_worth ?? null;
}

/**
 * Today's calorie total vs target. Defensive: the nutrition tables may not exist
 * yet, so any failure degrades to "—" (null) rather than crashing the dashboard.
 */
async function todayNutrition(
  db: Db,
  todayKey: string
): Promise<{ calories: number | null; target: number | null }> {
  try {
    const [logsRes, targetRes] = await Promise.all([
      db.from("nutrition_logs").select("calories").eq("log_date", todayKey),
      db.from("nutrition_targets").select("calories").limit(1).maybeSingle(),
    ]);
    if (logsRes.error) return { calories: null, target: null };
    const calories = (logsRes.data ?? []).reduce(
      (sum: number, r: { calories: number | null }) => sum + (r.calories ?? 0),
      0
    );
    const target =
      !targetRes.error && targetRes.data
        ? (targetRes.data as { calories: number }).calories
        : null;
    return { calories, target };
  } catch {
    return { calories: null, target: null };
  }
}
