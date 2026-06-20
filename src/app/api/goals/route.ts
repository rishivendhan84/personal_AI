import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import type { Goal, GoalProject, Task, GoalType } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Goals collection (PRD §7.5). The hierarchy is Goal → Projects → Tasks, so GET
 * returns goals with their projects nested and a deterministic progress figure
 * (% of the goal's tasks that are done) computed in the API — never AI, never on
 * page load of the consumer. Cards just render what we hand back.
 */

export interface GoalProgress {
  total: number;
  done: number;
  pct: number; // 0..100, rounded
}

export interface GoalWithDetail extends Goal {
  projects: GoalProject[];
  progress: GoalProgress;
}

/** GET /api/goals — goals + nested projects + task-completion progress. */
export const GET = route(async () => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true, goals: [] as GoalWithDetail[] });

  const [goalsRes, projectsRes, tasksRes] = await Promise.all([
    db.from("goals").select("*").order("created_at", { ascending: false }),
    db.from("goal_projects").select("*").order("created_at", { ascending: true }),
    // Only the columns we need to compute progress — keeps the payload lean.
    db.from("tasks").select("goal_id,status"),
  ]);
  if (goalsRes.error) throw goalsRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (tasksRes.error) throw tasksRes.error;

  const goals = (goalsRes.data ?? []) as Goal[];
  const projects = (projectsRes.data ?? []) as GoalProject[];
  const taskStats = (tasksRes.data ?? []) as Pick<Task, "goal_id" | "status">[];

  const goalsWithDetail: GoalWithDetail[] = goals.map((g) => {
    const goalTasks = taskStats.filter((t) => t.goal_id === g.id);
    const total = goalTasks.length;
    const done = goalTasks.filter((t) => t.status === "done").length;
    return {
      ...g,
      projects: projects.filter((p) => p.goal_id === g.id),
      progress: { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) },
    };
  });

  return ok({ goals: goalsWithDetail });
});

/** POST /api/goals — create a goal. period_start is a real date (manual reset). */
export const POST = route(async (req: Request) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });

  const body = (await req.json()) as Partial<Goal>;
  if (!body.title?.trim()) throw new Error("title is required");

  const type: GoalType = body.type === "monthly" ? "monthly" : "weekly";
  const insert = {
    title: body.title.trim(),
    type,
    // Default to today (the period this goal starts counting from). Manual reset
    // only — there's no auto-rollover, so the start date is whatever we set here.
    period_start: body.period_start || new Date().toISOString().slice(0, 10),
    status: body.status ?? "active",
  };

  const { data, error } = await db.from("goals").insert(insert).select("*").single();
  if (error) throw error;

  return ok({ goal: data as Goal });
});
