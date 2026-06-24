import { route, ok, fail } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import type { NoteChecklistItem } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * POST /api/notes/import — bulk import notes parsed from a Google Keep Takeout
 * export (the client parses the per-note JSON files and posts them here).
 * Upserts on keep_id so re-importing updates rather than duplicates.
 * Body: { notes: ImportNote[] }.
 */
interface ImportNote {
  title?: string | null;
  body?: string | null;
  checklist?: NoteChecklistItem[] | null;
  color?: string;
  pinned?: boolean;
  archived?: boolean;
  labels?: string[];
  keep_id: string;
  created_at?: string;
  updated_at?: string;
}

export const POST = route(async (req: Request) => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });

  const { notes } = (await req.json()) as { notes?: ImportNote[] };
  if (!Array.isArray(notes) || notes.length === 0) return fail("no notes to import", 400);

  const rows = notes
    .filter((n) => n.keep_id)
    .map((n) => ({
      title: n.title?.trim() || null,
      body: n.body?.trim() || null,
      checklist: Array.isArray(n.checklist) && n.checklist.length ? n.checklist : null,
      color: n.color || "default",
      pinned: !!n.pinned,
      archived: !!n.archived,
      labels: Array.isArray(n.labels) ? n.labels : [],
      source: "keep_takeout",
      keep_id: n.keep_id,
      created_at: n.created_at || undefined,
      updated_at: n.updated_at || undefined,
    }))
    // Drop fully-empty notes.
    .filter((r) => r.title || r.body || r.checklist);

  if (rows.length === 0) return ok({ imported: 0 });

  const { data, error } = await db
    .from("notes")
    .upsert(rows, { onConflict: "keep_id" })
    .select("id");
  if (error) throw error;

  return ok({ imported: data?.length ?? rows.length });
});
