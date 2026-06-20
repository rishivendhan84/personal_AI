import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { getTodayBrief, pushNudge } from "@/lib/direction";
import type { Task } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Midday check (~13:00, PRD §7.0). Reads today's brief top-3 and finds which are
 * still not done. Single-next-action: we push only the SINGLE most important
 * undone task ("Still open: X"), never the whole list — no nagging, no dump.
 * If everything's done we send one quiet "on track" and stop. Records nudges
 * type=midday.
 */
async function run() {
  const db = getAdminClient();
  if (!db) return ok({ skipped: "db not configured" });

  const brief = await getTodayBrief();
  if (!brief || brief.top3.length === 0) {
    return ok({ skipped: "no brief/top3 for today" });
  }

  const ids = brief.top3.map((t) => t.id);
  const { data: tasks } = await db
    .from("tasks")
    .select("id,status")
    .in("id", ids);

  const statusById = new Map((tasks ?? []).map((t: Pick<Task, "id" | "status">) => [t.id, t.status]));
  // top3 is already priority-ordered by the brief, so the first incomplete entry
  // is the single most important undone task.
  const nextUp = brief.top3.find((t) => statusById.get(t.id) !== "done");

  if (!nextUp) {
    await pushNudge("midday", "On track 🎯 Top 3 handled — keep the momentum.");
    return ok({ allDone: true });
  }

  await pushNudge("midday", `⏳ Still open: *${nextUp.title}* — knock it out.`);
  return ok({ nudged: nextUp.id });
}

export const GET = route(run);
export const POST = route(run);
