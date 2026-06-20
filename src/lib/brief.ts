import "server-only";
import { getAdminClient } from "@/lib/db/server";
import { rankTasks } from "@/lib/prioritization";
import { reason, aiAvailable } from "@/lib/ai";
import { dateKeyInTz, DEFAULT_TZ, USER_ID } from "@/lib/utils";
import type {
  DailyBrief,
  DailyBriefContent,
  DailyReview,
  Task,
  Habit,
  HabitLog,
  CalendarEvent,
  Goal,
  User,
} from "@/lib/db/types";

/**
 * Daily Brief (PRD §8.1). Assembled deterministically from the latest snapshot;
 * the LLM only writes the one-line focus framing. Persisted to `daily_briefs`
 * so the dashboard reads the cache and NEVER calls AI on load (§5, §12).
 */
export async function generateBrief(now = new Date()): Promise<DailyBriefContent> {
  const db = getAdminClient();
  if (!db) {
    return {
      focus: "Connect Supabase to activate your daily brief.",
      top3: [],
      calendar: [],
      overdue: [],
      habits: [],
      goal_progress: [],
    };
  }

  const { data: user } = await db.from("users").select("*").eq("id", USER_ID).single<User>();
  const tz = user?.timezone ?? DEFAULT_TZ;
  const todayKey = dateKeyInTz(now, tz);

  const [{ data: tasks }, { data: reviews }, { data: habits }, { data: logs }, { data: events }, { data: goals }] =
    await Promise.all([
      db.from("tasks").select("*").neq("status", "done"),
      db.from("daily_reviews").select("*").order("review_date", { ascending: false }).limit(7),
      db.from("habits").select("*").eq("active", true),
      db.from("habit_logs").select("*").eq("log_date", todayKey),
      db
        .from("calendar_events")
        .select("*")
        .gte("start_at", `${todayKey}T00:00:00`)
        .lte("start_at", `${todayKey}T23:59:59`)
        .order("start_at"),
      db.from("goals").select("*").eq("status", "active"),
    ]);

  const ranked = rankTasks((tasks ?? []) as Task[], {
    now,
    reviews: (reviews ?? []) as DailyReview[],
  });

  const top3 = ranked.slice(0, 3).map((t) => ({
    id: t.id,
    title: t.title,
    reason: t.goal_id ? "goal-aligned" : t.urgency === "today" ? "due today" : "high priority",
  }));

  const overdue = ranked
    .filter((t) => t.due_date && new Date(t.due_date) < now)
    .slice(0, 5)
    .map((t) => ({ id: t.id, title: t.title }));

  const completedHabitIds = new Set((logs ?? []).map((l: HabitLog) => l.habit_id));
  const habitStatus = (habits ?? []).map((h: Habit) => ({
    name: h.name,
    done: completedHabitIds.has(h.id),
  }));

  // Goal progress = % of the goal's tasks that are done (deterministic).
  const goalProgress = await Promise.all(
    ((goals ?? []) as Goal[]).map(async (g) => {
      const { count: total } = await db
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("goal_id", g.id);
      const { count: done } = await db
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("goal_id", g.id)
        .eq("status", "done");
      const pct = total && total > 0 ? Math.round(((done ?? 0) / total) * 100) : 0;
      return { title: g.title, pct };
    })
  );

  const calendar = ((events ?? []) as CalendarEvent[]).map((e) => ({
    title: e.title,
    start_at: e.start_at,
  }));

  // The single line of direction. LLM if available, deterministic otherwise.
  let focus = top3[0]?.title ? `Start with: ${top3[0].title}` : "No open tasks — capture something.";
  if (aiAvailable.llm() && top3.length > 0) {
    try {
      focus = (
        await reason({
          system:
            "You are a terse personal chief-of-staff. Output ONE motivating sentence (max 18 words) telling the user the single most important thing to focus on today. No preamble.",
          prompt: `Top tasks: ${top3.map((t) => t.title).join("; ")}.\nEvents: ${
            calendar.map((c) => c.title).join("; ") || "none"
          }.\nOverdue: ${overdue.length}.`,
          maxTokens: 60,
        })
      )
        .trim()
        .replace(/^["']|["']$/g, "");
    } catch {
      /* keep deterministic fallback */
    }
  }

  return { focus, top3, calendar, overdue, habits: habitStatus, goal_progress: goalProgress };
}

/** Generate + persist today's brief (idempotent upsert on brief_date). */
export async function generateAndStoreBrief(now = new Date()): Promise<DailyBriefContent> {
  const db = getAdminClient();
  const content = await generateBrief(now);
  if (db) {
    const { data: user } = await db.from("users").select("timezone").eq("id", USER_ID).single();
    const tz = (user?.timezone as string) ?? DEFAULT_TZ;
    await db
      .from("daily_briefs")
      .upsert(
        { brief_date: dateKeyInTz(now, tz), content, generated_at: new Date().toISOString() },
        { onConflict: "brief_date" }
      );
  }
  return content;
}

/** Read the latest cached brief for the dashboard (no AI). */
export async function getLatestBrief(): Promise<DailyBrief | null> {
  const db = getAdminClient();
  if (!db) return null;
  const { data } = await db
    .from("daily_briefs")
    .select("*")
    .order("brief_date", { ascending: false })
    .limit(1)
    .maybeSingle<DailyBrief>();
  return data ?? null;
}
