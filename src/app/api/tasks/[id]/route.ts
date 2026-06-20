import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import type { Task } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Single task ops. PATCH handles every inline mutation the board does — status /
 * urgency drops, field edits, and drag-reorder (sort_order) — through one
 * whitelisted update so the client never has to hit multiple endpoints.
 */

type Ctx = { params: Promise<{ id: string }> };

// Only these may be set from the client. ai_priority_score is server-computed.
const PATCHABLE = [
  "title",
  "description",
  "category",
  "urgency",
  "status",
  "due_date",
  "effort_score",
  "goal_id",
  "project_id",
  "sort_order",
] as const;

/** PATCH /api/tasks/[id] */
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });
  const { id } = await ctx.params;

  const body = (await req.json()) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const k of PATCHABLE) {
    if (k in body) update[k] = body[k];
  }
  // Moving to/from done maintains completed_at so reviews + progress stay honest.
  if ("status" in body) {
    update.completed_at = body.status === "done" ? new Date().toISOString() : null;
  }
  if (Object.keys(update).length === 0) throw new Error("no patchable fields supplied");

  const { data, error } = await db
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  return ok({ task: data as Task });
});

/** DELETE /api/tasks/[id] */
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });
  const { id } = await ctx.params;

  const { error } = await db.from("tasks").delete().eq("id", id);
  if (error) throw error;

  return ok({ id });
});
