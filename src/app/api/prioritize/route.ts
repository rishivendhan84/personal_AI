import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { rankTasks } from "@/lib/prioritization";
import type { Task, DailyReview } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Manual prioritization refresh (PRD §8.2). The "Refresh priorities" button on
 * the tasks page hits this. We deliberately compute scores HERE (on demand /
 * schedule), never on page load, then persist them so subsequent reads are cheap.
 *
 *   load open tasks + last 7 daily_reviews → rankTasks() → persist score → return
 */
export const POST = route(async () => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });

  // Open tasks only — done tasks are dropped by rankTasks and don't need scoring.
  const { data: taskRows, error: tErr } = await db
    .from("tasks")
    .select("*")
    .neq("status", "done");
  if (tErr) throw tErr;
  const tasks = (taskRows ?? []) as Task[];

  // Last 7 reviews feed the deferral penalty (top-3 listed but not completed).
  const { data: reviewRows, error: rErr } = await db
    .from("daily_reviews")
    .select("*")
    .order("review_date", { ascending: false })
    .limit(7);
  if (rErr) throw rErr;
  const reviews = (reviewRows ?? []) as DailyReview[];

  const ranked = rankTasks(tasks, { reviews });

  // Persist each score. Sequential is fine here (single-user, small N) and keeps
  // the failure mode obvious; the deterministic math means re-running is safe.
  for (const t of ranked) {
    const { error } = await db
      .from("tasks")
      .update({ ai_priority_score: t.ai_priority_score })
      .eq("id", t.id);
    if (error) throw error;
  }

  return ok({ tasks: ranked, scored: ranked.length });
});
