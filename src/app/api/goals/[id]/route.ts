import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import type { Goal } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Single goal ops. PATCH = edit title/type/status or "reset" by setting a new
 * period_start (PRD §7.5: manual reset only). DELETE cascades to goal_projects
 * via the FK; tasks just have goal_id/project_id nulled (on delete set null).
 */

type Ctx = { params: Promise<{ id: string }> };

const PATCHABLE = ["title", "type", "status", "period_start"] as const;

/** PATCH /api/goals/[id] */
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });
  const { id } = await ctx.params;

  const body = (await req.json()) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const k of PATCHABLE) {
    if (k in body) update[k] = body[k];
  }
  if (Object.keys(update).length === 0) throw new Error("no patchable fields supplied");

  const { data, error } = await db
    .from("goals")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  return ok({ goal: data as Goal });
});

/** DELETE /api/goals/[id] */
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });
  const { id } = await ctx.params;

  const { error } = await db.from("goals").delete().eq("id", id);
  if (error) throw error;

  return ok({ id });
});
