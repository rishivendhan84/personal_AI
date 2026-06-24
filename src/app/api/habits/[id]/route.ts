import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import type { Habit } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Single habit ops. PATCH edits the habit's name / target / active flag.
 * DELETE removes the habit row (its habit_logs cascade per the schema FK), so a
 * deleted habit drops out of the grid and stops counting toward streaks.
 */

type Ctx = { params: Promise<{ id: string }> };

const PATCHABLE = ["name", "target", "active"] as const;

/** PATCH /api/habits/[id] */
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });
  const { id } = await ctx.params;

  const body = (await req.json()) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const k of PATCHABLE) {
    if (k in body) update[k] = body[k];
  }
  // Normalize the editable text fields.
  if (typeof update.name === "string") update.name = update.name.trim();
  if (typeof update.target === "string") update.target = (update.target as string).trim() || null;
  if (update.name === "") throw new Error("name cannot be empty");
  if (Object.keys(update).length === 0) throw new Error("no patchable fields supplied");

  const { data, error } = await db
    .from("habits")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  return ok({ habit: data as Habit });
});

/** DELETE /api/habits/[id] */
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });
  const { id } = await ctx.params;

  const { error } = await db.from("habits").delete().eq("id", id);
  if (error) throw error;

  return ok({ id });
});
