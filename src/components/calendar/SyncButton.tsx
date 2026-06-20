"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";

/**
 * Manual calendar refresh (PRD §7.2). POSTs /api/calendar/sync (Google → DB
 * upsert) then refreshes the page to re-read the cache. No AI. Surfaces the
 * "not configured" skip so the user knows why nothing changed. Restyled as a
 * ShimmerButton with a spin state; data/API behavior is unchanged.
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
      {note && (
        <span className="text-xs text-muted-foreground/80 tabular-nums">{note}</span>
      )}
      <ShimmerButton onClick={sync} loading={loading} aria-label="Sync calendar">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-violet" />
        ) : (
          <RefreshCw className="h-4 w-4 text-violet" />
        )}
        Sync
      </ShimmerButton>
    </div>
  );
}
