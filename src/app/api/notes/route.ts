import { route, ok, fail } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import type { Note } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * GET /api/notes — list notes for the board. `?archived=1` returns archived
 * notes instead of active ones. Ordered pinned-first, most-recently-edited first.
 */
export const GET = route(async (req: Request) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true, notes: [] as Note[] });

  const archived = new URL(req.url).searchParams.get("archived") === "1";
  const { data, error } = await db
    .from("notes")
    .select("*")
    .eq("archived", archived)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return ok({ notes: (data ?? []) as Note[] });
});

/**
 * POST /api/notes — create a note. Body: { title?, body?, checklist?, color? }.
 * Rejects fully-empty notes so the board never fills with blanks.
 */
export const POST = route(async (req: Request) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });

  const b = (await req.json()) as Partial<Note>;
  const title = b.title?.trim() || null;
  const body = b.body?.trim() || null;
  const checklist = Array.isArray(b.checklist) && b.checklist.length ? b.checklist : null;
  if (!title && !body && !checklist) return fail("note is empty", 400);

  const { data, error } = await db
    .from("notes")
    .insert({
      title,
      body,
      checklist,
      color: b.color || "default",
      source: "app",
    })
    .select("*")
    .single();
  if (error) throw error;

  return ok({ note: data as Note });
});
