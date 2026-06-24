import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import type { Note } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Single note ops. PATCH edits any board-mutable field (content, color, pin,
 * archive, labels) and always bumps updated_at so ordering stays fresh.
 * DELETE removes the note permanently.
 */

type Ctx = { params: Promise<{ id: string }> };

const PATCHABLE = [
  "title",
  "body",
  "checklist",
  "color",
  "pinned",
  "archived",
  "labels",
] as const;

/** PATCH /api/notes/[id] */
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });
  const { id } = await ctx.params;

  const b = (await req.json()) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const k of PATCHABLE) {
    if (k in b) update[k] = b[k];
  }
  if (typeof update.title === "string") update.title = (update.title as string).trim() || null;
  if (typeof update.body === "string") update.body = (update.body as string).trim() || null;
  if (Object.keys(update).length === 0) throw new Error("no patchable fields supplied");
  update.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from("notes")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  return ok({ note: data as Note });
});

/** DELETE /api/notes/[id] */
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });
  const { id } = await ctx.params;

  const { error } = await db.from("notes").delete().eq("id", id);
  if (error) throw error;

  return ok({ id });
});
