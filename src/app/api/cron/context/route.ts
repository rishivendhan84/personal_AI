import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { getUser, userTz, pushNudge, timeInTz, keywordOverlap } from "@/lib/direction";
import type { CalendarEvent, MemoryChunk, Task } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Context surfacing (event approaching, PRD §7.0). For events starting in the
 * next ~2h, surface the open tasks / memory the user will want IN HAND — matched
 * by simple keyword overlap between the event title and task titles, plus any
 * memory_chunks mentioning it. Single-next-action: a tight "heads-up, here's
 * what's relevant" per event, not a dump of the whole graph. Records nudges
 * type=context.
 */
const WINDOW_MS = 2 * 60 * 60 * 1000;

async function run() {
  const db = getAdminClient();
  if (!db) return ok({ skipped: "db not configured" });

  const now = new Date();
  const horizon = new Date(now.getTime() + WINDOW_MS);
  const user = await getUser();
  const tz = userTz(user);

  const { data: events } = await db
    .from("calendar_events")
    .select("*")
    .gte("start_at", now.toISOString())
    .lte("start_at", horizon.toISOString())
    .order("start_at");

  const upcoming = (events ?? []) as CalendarEvent[];
  if (upcoming.length === 0) return ok({ events: 0 });

  // Open tasks (small single-user dataset; keyword-match in memory).
  const { data: openTasks } = await db.from("tasks").select("id,title").neq("status", "done");
  const tasks = (openTasks ?? []) as Pick<Task, "id" | "title">[];

  let nudged = 0;
  for (const ev of upcoming) {
    const relevantTasks = tasks.filter((t) => keywordOverlap(ev.title, t.title)).slice(0, 3);

    // Memory mentioning the event — keyword ILIKE on the most salient word.
    const keyword = ev.title.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3)[0];
    let chunks: Pick<MemoryChunk, "content">[] = [];
    if (keyword) {
      const { data } = await db
        .from("memory_chunks")
        .select("content")
        .ilike("content", `%${keyword}%`)
        .limit(2);
      chunks = (data ?? []) as Pick<MemoryChunk, "content">[];
    }

    // Skip pure reminders with nothing to surface — don't ping for noise.
    if (relevantTasks.length === 0 && chunks.length === 0) continue;

    const lines: string[] = [`📌 *${timeInTz(ev.start_at, tz)} — ${ev.title}* coming up.`];
    if (relevantTasks.length) {
      lines.push("Related open:");
      relevantTasks.forEach((t) => lines.push(`• ${t.title}`));
    }
    if (chunks.length) {
      lines.push("From memory:");
      chunks.forEach((c) => lines.push(`• ${c.content.slice(0, 120)}`));
    }

    await pushNudge("context", lines.join("\n"));
    nudged += 1;
  }

  return ok({ events: upcoming.length, nudged });
}

export const GET = route(run);
export const POST = route(run);
