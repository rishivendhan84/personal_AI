import { getAdminClient } from "@/lib/db/server";
import { PageHeader, SetupHint } from "@/components/ui/page";
import { NotesBoard } from "@/components/notes/NotesBoard";
import type { Note } from "@/lib/db/types";

// Notes change often (pins, edits, imports) — never serve a stale board.
export const dynamic = "force-dynamic";

/**
 * Notes page — a Google Keep–style board, native to the OS. Bring your real
 * Keep notes in via the Takeout importer (Google's official export). Server
 * component seeds the initial board; the client handles create/edit/pin/etc.
 */
export default async function NotesPage() {
  const db = getAdminClient();

  if (!db) {
    return (
      <>
        <PageHeader title="Notes" description="A Keep-style board for your notes." />
        <SetupHint what="Notes" vars={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]} />
      </>
    );
  }

  // Defensive: the notes table may not exist yet (migration 0006 not applied).
  const { data, error } = await db
    .from("notes")
    .select("*")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <>
        <PageHeader title="Notes" description="A Keep-style board for your notes." />
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">The notes table isn&apos;t set up yet.</p>
          <p className="mt-1 text-muted-foreground">
            Run migration{" "}
            <code className="rounded bg-foreground/10 px-1">supabase/migrations/0006_notes.sql</code>{" "}
            in the Supabase SQL editor, then refresh.
          </p>
        </div>
      </>
    );
  }

  return <NotesBoard initial={(data ?? []) as Note[]} />;
}
