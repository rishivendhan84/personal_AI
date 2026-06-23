import { CalendarClock } from "lucide-react";
import { getLatestBrief } from "@/lib/brief";
import { getAdminClient } from "@/lib/db/server";
import { USER_ID, dateKeyInTz } from "@/lib/utils";
import { computeStreak } from "@/lib/streaks";
import { URGENCY_ORDER, USER_TZ } from "@/lib/ui";
import type {
  User,
  CalendarEvent,
  Task,
  TaskUrgency,
  HabitLog,
  FinanceSnapshot,
} from "@/lib/db/types";
import { SetupHint } from "@/components/ui/page";
import { BentoGrid, TopRegion, StackColumn, BentoMasonry } from "@/components/dashboard/BentoGrid";
import { OperatorHero } from "@/components/dashboard/OperatorHero";
import {
  TasksTile,
  CalendarTile,
  GoalsTile,
  FinanceTile,
  BriefBanner,
  type DashTask,
} from "@/components/dashboard/BentoTiles";
import { HabitsTile, type DashHabit } from "@/components/dashboard/HabitsTile";
import { NutritionTile } from "@/components/dashboard/NutritionTile";
import { FocusTile } from "@/components/dashboard/FocusTile";
import { RadarChart, type RadarDatum } from "@/components/dashboard/LifeRadar";
import { QuickAddTask } from "@/components/dashboard/QuickAddTask";
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
              Welcome to your assistant
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Connect Supabase to activate your Operator console.
            </p>
          </BentoCard>
        </BentoGrid>
        <SetupHint
          what="Your assistant"
          vars={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]}
        />
      </div>
    );
  }

  const userRes = await db.from("users").select("*").eq("id", USER_ID).maybeSingle<User>();
  const user = userRes.data;
  // Single-user app fixed to Chennai: drive the console off the declared home
  // timezone (USER_TZ = Asia/Kolkata) so the clock is correct even if the DB
  // row predates migration 0004. Falls back to the row only if it's already IST.
  const tz =
    user?.timezone === "Asia/Kolkata" ? user.timezone : USER_TZ;
  const todayKey = dateKeyInTz(new Date(), tz);

  const [
    brief,
    events,
    taskCounts,
    tasksDoneToday,
    bestStreak,
    netWorth,
    nutrition,
    habits,
    goals,
    topTasks,
    lifeScores,
  ] = await Promise.all([
    getLatestBrief(),
    todayEvents(db, todayKey),
    openTaskCounts(db),
    tasksDoneTodayCount(db, todayKey),
    bestStreakAcrossHabits(db, todayKey),
    latestNetWorth(db),
    todayNutrition(db, todayKey),
    habitsWithTodayState(db, todayKey),
    dashboardGoals(db),
    topOpenTasks(db),
    lifeRadar(db, tz),
  ]);
  void events; // (kept for future use; calendar tile reads the brief's list)

  const name = user?.name?.split(" ")[0] ?? "Operator";

  // The focus shown on top of all cards = the user's editable focus (not the
  // stale AI brief line, which could reference an already-completed task).
  const focusText =
    user?.current_focus &&
    user.current_focus.trim().toLowerCase() !== "ship the paios vertical slice"
      ? user.current_focus
      : null;

  if (!brief) {
    // No brief yet — still a working surface: quick-add tasks and complete
    // habits inline before generation. The interactive tiles don't need a brief.
    return (
      <div className="space-y-4">
        {focusText && <BriefBanner focus={focusText} />}
        <TopRegion>
          <BentoCard glow span="lg:col-span-2">
            <div className="flex h-full flex-col items-center justify-center gap-6 py-8 text-center">
              <div>
                <CalendarClock className="mx-auto h-8 w-8 text-violet" />
                <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight">
                  No brief yet today
                </h1>
                <p className="mb-6 mt-2 max-w-sm text-sm text-muted-foreground">
                  Generate your daily brief to see your focus, priorities, and schedule — or just
                  start working below.
                </p>
                <GenerateBriefButton />
              </div>
              <div className="w-full max-w-md text-left">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Quick capture
                </p>
                <QuickAddTask />
              </div>
              <div className="w-full max-w-sm">
                <RadarChart data={lifeScores} />
              </div>
            </div>
          </BentoCard>
          <StackColumn>
            <FocusTile />
            <HabitsTile habits={habits} bestStreak={bestStreak} />
          </StackColumn>
        </TopRegion>
        <BentoMasonry>
          <TasksTile counts={taskCounts} tasks={topTasks} />
          <CalendarTile calendar={[]} timeZone={tz} />
          <GoalsTile goals={goals} />
          <NutritionTile calories={nutrition.calories} target={nutrition.target} />
          <FinanceTile netWorth={netWorth} />
        </BentoMasonry>
      </div>
    );
  }

  const c = brief.content;

  return (
    <div className="space-y-4">
      {focusText && <BriefBanner focus={focusText} />}

      <TopRegion>
        <OperatorHero
          name={name}
          focus={user?.current_focus ?? null}
          location={user?.current_location ?? null}
          timeZone={tz}
          calendar={c.calendar}
          tasksDoneToday={tasksDoneToday}
          bestStreak={bestStreak}
          radar={lifeScores}
        />
        <StackColumn>
          <FocusTile />
          <HabitsTile habits={habits} bestStreak={bestStreak} />
        </StackColumn>
      </TopRegion>
      <BentoMasonry>
        <TasksTile counts={taskCounts} tasks={topTasks} />
        <CalendarTile calendar={c.calendar} timeZone={tz} />
        <GoalsTile goals={goals} />
        <NutritionTile calories={nutrition.calories} target={nutrition.target} />
        <FinanceTile netWorth={netWorth} />
      </BentoMasonry>
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

/**
 * Active habits with today's done-state and their ids — the brief's habits array
 * carries no ids, so the dashboard can't toggle from it. We read the `habits`
 * table (active) + today's `habit_logs` (log_date = todayKey) and join into the
 * {id, name, done}[] the interactive tiles need. Defensive: degrades to [].
 */
async function habitsWithTodayState(db: Db, todayKey: string): Promise<DashHabit[]> {
  try {
    const [habitsRes, logsRes] = await Promise.all([
      db.from("habits").select("id, name").eq("active", true).order("name"),
      db.from("habit_logs").select("habit_id").eq("log_date", todayKey),
    ]);
    if (habitsRes.error) return [];
    const doneIds = new Set(
      (logsRes.data ?? []).map((l: { habit_id: string }) => l.habit_id)
    );
    return ((habitsRes.data ?? []) as { id: string; name: string }[]).map((h) => ({
      id: h.id,
      name: h.name,
      done: doneIds.has(h.id),
    }));
  } catch {
    return [];
  }
}

/**
 * Active goals with deterministic progress (% of the goal's tasks done) — read
 * straight from the goals/tasks tables so the dashboard matches the Goals page
 * even when no brief has been generated. Degrades to [] on any failure.
 */
async function dashboardGoals(db: Db): Promise<{ title: string; pct: number }[]> {
  try {
    const { data } = await db
      .from("goals")
      .select("id, title")
      .eq("status", "active")
      .order("created_at", { ascending: true });
    const goals = ((data ?? []) as { id: string; title: string }[]).slice(0, 6);
    return await Promise.all(
      goals.map(async (g) => {
        const [{ count: total }, { count: done }] = await Promise.all([
          db.from("tasks").select("*", { count: "exact", head: true }).eq("goal_id", g.id),
          db
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("goal_id", g.id)
            .eq("status", "done"),
        ]);
        const pct = total && total > 0 ? Math.round(((done ?? 0) / total) * 100) : 0;
        return { title: g.title, pct };
      })
    );
  } catch {
    return [];
  }
}

/** Top open tasks (highest priority first) for the actionable Tasks tile. */
async function topOpenTasks(db: Db): Promise<DashTask[]> {
  try {
    const { data } = await db
      .from("tasks")
      .select("id, title, urgency")
      .neq("status", "done")
      .order("ai_priority_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(6);
    return (data ?? []) as DashTask[];
  } catch {
    return [];
  }
}

/**
 * Life Radar scores (0-100) across five dimensions, derived deterministically:
 * Career/Learning/Business = % of that task category completed; Health = 7-day
 * habit completion rate; Finance = savings rate (or net-worth presence).
 */
async function lifeRadar(db: Db, tz: string): Promise<RadarDatum[]> {
  try {
    const [tasksRes, habitsRes, logsRes, finRes] = await Promise.all([
      db.from("tasks").select("category, status"),
      db.from("habits").select("id", { count: "exact", head: true }).eq("active", true),
      db.from("habit_logs").select("log_date"),
      db
        .from("finance_snapshots")
        .select("savings_rate, net_worth")
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle<{ savings_rate: number | null; net_worth: number | null }>(),
    ]);

    const tasks = (tasksRes.data ?? []) as { category: string; status: string }[];
    const pctDone = (cat: string): number => {
      const inCat = tasks.filter((t) => t.category === cat);
      if (inCat.length === 0) return 0;
      return Math.round((inCat.filter((t) => t.status === "done").length / inCat.length) * 100);
    };

    // Health: completion rate across active habits over the last 7 days.
    const activeHabits = habitsRes.count ?? 0;
    const last7 = new Set<string>();
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      last7.add(dateKeyInTz(d, tz));
    }
    const logs = (logsRes.data ?? []) as { log_date: string }[];
    const recent = logs.filter((l) => last7.has(l.log_date)).length;
    const health = activeHabits > 0 ? Math.min(100, Math.round((recent / (activeHabits * 7)) * 100)) : 0;

    // Finance: savings rate → %, else a midpoint when net worth is positive.
    const fin = finRes.data;
    const finance =
      fin?.savings_rate != null
        ? Math.min(100, Math.max(0, Math.round(fin.savings_rate * 100)))
        : fin?.net_worth && fin.net_worth > 0
          ? 50
          : 0;

    return [
      { label: "Career", value: pctDone("Work") },
      { label: "Health", value: health },
      { label: "Learning", value: pctDone("Learning") },
      { label: "Finance", value: finance },
      { label: "Business", value: pctDone("Business") },
    ];
  } catch {
    return [
      { label: "Career", value: 0 },
      { label: "Health", value: 0 },
      { label: "Learning", value: 0 },
      { label: "Finance", value: 0 },
      { label: "Business", value: 0 },
    ];
  }
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
