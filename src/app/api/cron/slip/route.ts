import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { rankTasks } from "@/lib/prioritization";
import { pushNudge } from "@/lib/direction";
import type { DailyReview, Task } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Slip detection (hourly, PRD §7.0). Finds tasks past due_date and not done,
 * re-ranks them with the deterministic scorer (which now weighs in §8.2 recent
 * deferrals from daily_reviews), and persists the refreshed ai_priority_score so
 * the dashboard/brief read the cache without recomputing. Single-next-action: we
 * ping ONE task — the highest-ranked overdue item — not the whole slipped pile.
 * Records nudges type=slip.
 */
async function run() {
  const db = getAdminClient();
  if (!db) return ok({ skipped: "db not configured" });

  const now = new Date();
  const nowIso = now.toISOString();

  const [{ data: overdue }, { data: reviews }] = await Promise.all([
    db.from("tasks").select("*").neq("status", "done").lt("due_date", nowIso),
    db.from("daily_reviews").select("*").order("review_date", { ascending: false }).limit(7),
  ]);

  const tasks = (overdue ?? []) as Task[];
  if (tasks.length === 0) return ok({ overdue: 0 });

  const ranked = rankTasks(tasks, { now, reviews: (reviews ?? []) as DailyReview[] });

  // Persist refreshed scores (the ranking is computed on schedule, never on load).
  await Promise.all(
    ranked.map((t) =>
      db.from("tasks").update({ ai_priority_score: t.ai_priority_score }).eq("id", t.id)
    )
  );

  const top = ranked[0];
  await pushNudge("slip", `🚨 Slipping: *${top.title}* is overdue — make it the next thing you do.`);
  return ok({ overdue: ranked.length, nudged: top.id });
}

export const GET = route(run);
export const POST = route(run);
