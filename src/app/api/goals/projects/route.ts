import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import type { GoalProject } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Goal projects (the middle of the Goal → Project → Task hierarchy). Kept on its
 * own route so the goals page and the new-task form can both populate project
 * dropdowns without a nested [id] segment. PATCH-by-query keeps it flat.
 */

/** GET /api/goals/projects?goal_id= — projects, optionally scoped to one goal. */
export const GET = route(async (req: Request) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true, projects: [] as GoalProject[] });

  const goalId = new URL(req.url).searchParams.get("goal_id");
  let query = db.from("goal_projects").select("*");
  if (goalId) query = query.eq("goal_id", goalId);

  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) throw error;

  return ok({ projects: (data ?? []) as GoalProject[] });
});

/** POST /api/goals/projects — create a project under a goal. */
export const POST = route(async (req: Request) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });

  const body = (await req.json()) as Partial<GoalProject>;
  if (!body.goal_id) throw new Error("goal_id is required");
  if (!body.title?.trim()) throw new Error("title is required");

  const { data, error } = await db
    .from("goal_projects")
    .insert({ goal_id: body.goal_id, title: body.title.trim(), status: body.status ?? "active" })
    .select("*")
    .single();
  if (error) throw error;

  return ok({ project: data as GoalProject });
});

/** PATCH /api/goals/projects?id= — update title/status (flat, no [id] segment). */
export const PATCH = route(async (req: Request) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new Error("id query param is required");

  const body = (await req.json()) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const k of ["title", "status"] as const) {
    if (k in body) update[k] = body[k];
  }
  if (Object.keys(update).length === 0) throw new Error("no patchable fields supplied");

  const { data, error } = await db
    .from("goal_projects")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  return ok({ project: data as GoalProject });
});
