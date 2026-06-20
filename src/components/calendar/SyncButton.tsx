"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Manual calendar refresh (PRD §7.2). POSTs /api/calendar/sync (Google → DB
 * upsert) then refreshes the page to re-read the cache. No AI. Surfaces the
 * "not configured" skip so the user knows why nothing changed.
 */
export function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setNote(null);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? `Sync failed (${res.status})`);
      if (json?.data?.skipped) setNote(json.data.skipped);
      else if (typeof json?.data?.synced === "number") setNote(`Synced ${json.data.synced} events`);
      router.refresh();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
      <Button variant="outline" size="sm" onClick={sync} disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Sync
      </Button>
    </div>
  );
}
