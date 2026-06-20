import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import type { Task, TaskCategory, TaskUrgency, TaskStatus } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Tasks collection (PRD §7.4). GET supports the structured filter box on the
 * tasks page (text + category + urgency + status) — deliberately NOT the Brain's
 * semantic search; this is plain SQL filtering. POST creates a manual task.
 *
 * Ordering: ai_priority_score desc when present (computed via /api/prioritize),
 * with sort_order as the deterministic tiebreaker for un-scored/equal rows.
 */

/** GET /api/tasks?q=&category=&urgency=&status= */
export const GET = route(async (req: Request) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true, tasks: [] as Task[] });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const category = url.searchParams.get("category") as TaskCategory | null;
  const urgency = url.searchParams.get("urgency") as TaskUrgency | null;
  const status = url.searchParams.get("status") as TaskStatus | null;

  let query = db.from("tasks").select("*");
  if (category) query = query.eq("category", category);
  if (urgency) query = query.eq("urgency", urgency);
  if (status) query = query.eq("status", status);
  // Title/description text match — ilike on both, escaping the wildcard chars.
  if (q) {
    const safe = q.replace(/[%_]/g, "\\$&");
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }

  // nullsFirst:false keeps un-scored tasks below scored ones; sort_order breaks ties.
  const { data, error } = await query
    .order("ai_priority_score", { ascending: false, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ok({ tasks: (data ?? []) as Task[] });
});

/** POST /api/tasks — create a manual task. */
export const POST = route(async (req: Request) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });

  const body = (await req.json()) as Partial<Task>;
  if (!body.title?.trim()) throw new Error("title is required");

  // Whitelist insertable fields. ai_priority_score is computed, never client-set.
  const insert = {
    title: body.title.trim(),
    description: body.description?.trim() || null,
    category: body.category ?? "Personal",
    urgency: body.urgency ?? "week",
    status: body.status ?? "todo",
    due_date: body.due_date || null,
    effort_score: body.effort_score ?? null,
    goal_id: body.goal_id || null,
    project_id: body.project_id || null,
    sort_order: body.sort_order ?? 0,
    source: "manual" as const,
  };

  const { data, error } = await db.from("tasks").insert(insert).select("*").single();
  if (error) throw error;

  return ok({ task: data as Task });
});
