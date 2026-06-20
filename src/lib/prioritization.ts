import type { DailyReview, Task } from "@/lib/db/types";

/**
 * Smart prioritization (PRD §8.2). Deterministic scoring — no AI in the math.
 * Computed on capture / refresh / schedule, never on page load.
 *
 *   score =  w1*urgency_tier + w2*due_proximity + w3*goal_alignment
 *          + w4*task_age + w5*effort_fit - w6*recent_deferrals
 */

export const WEIGHTS = {
  urgency: 0.3, // w1
  dueProximity: 0.25, // w2
  goalAlignment: 0.15, // w3
  taskAge: 0.1, // w4
  effortFit: 0.1, // w5
  deferrals: 0.2, // w6 (subtracted)
} as const;

const URGENCY_TIER: Record<Task["urgency"], number> = {
  today: 1.0,
  week: 0.6,
  month: 0.3,
  someday: 0.1,
};

/** 0..1, peaks as due_date approaches/passes; 0.4 baseline when no due date. */
function dueProximity(task: Task, now: Date): number {
  if (!task.due_date) return 0.4;
  const due = new Date(task.due_date).getTime();
  const hoursLeft = (due - now.getTime()) / 3_600_000;
  if (hoursLeft <= 0) return 1.0; // overdue → max urgency
  if (hoursLeft <= 24) return 0.9;
  if (hoursLeft <= 72) return 0.7;
  if (hoursLeft <= 168) return 0.5;
  return 0.3;
}

/** Tasks linked to an active goal/project rank higher (the alignment payoff). */
function goalAlignment(task: Task): number {
  if (task.project_id) return 1.0;
  if (task.goal_id) return 0.8;
  return 0.2;
}

/** Older open tasks float up so nothing rots silently. Saturates at ~14 days. */
function taskAge(task: Task, now: Date): number {
  const days = (now.getTime() - new Date(task.created_at).getTime()) / 86_400_000;
  return Math.min(1, days / 14);
}

/**
 * effort_fit (fix #8): match effort to time left in the day. Early in the day
 * deep work (5) fits; late in the day quick wins (1) fit better.
 */
function effortFit(task: Task, now: Date): number {
  const effort = task.effort_score ?? 3; // 1..5
  const hoursLeftInDay = Math.max(0, 23 - now.getHours());
  const capacity = Math.min(5, Math.max(1, Math.round(hoursLeftInDay / 3) + 1));
  // Closer effort↔capacity ⇒ better fit.
  return 1 - Math.abs(effort - capacity) / 4;
}

/** Count how many recent reviews listed this task in top-3 but not completed. */
function recentDeferrals(taskId: string, reviews: DailyReview[]): number {
  let deferrals = 0;
  for (const r of reviews) {
    const idx = r.top3_task_ids.indexOf(taskId);
    if (idx >= 0 && r.top3_completed[idx] === false) deferrals += 1;
  }
  return Math.min(1, deferrals / 3); // saturate at 3 misses
}

export function scoreTask(task: Task, ctx: { now?: Date; reviews?: DailyReview[] }): number {
  const now = ctx.now ?? new Date();
  const reviews = ctx.reviews ?? [];
  const w = WEIGHTS;
  const score =
    w.urgency * URGENCY_TIER[task.urgency] +
    w.dueProximity * dueProximity(task, now) +
    w.goalAlignment * goalAlignment(task) +
    w.taskAge * taskAge(task, now) +
    w.effortFit * effortFit(task, now) -
    w.deferrals * recentDeferrals(task.id, reviews);
  return Math.round(score * 1000) / 1000;
}

/** Rank open tasks high→low. Done tasks are dropped. */
export function rankTasks(
  tasks: Task[],
  ctx: { now?: Date; reviews?: DailyReview[] } = {}
): (Task & { ai_priority_score: number })[] {
  return tasks
    .filter((t) => t.status !== "done")
    .map((t) => ({ ...t, ai_priority_score: scoreTask(t, ctx) }))
    .sort((a, b) => b.ai_priority_score - a.ai_priority_score);
}
