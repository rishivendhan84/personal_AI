"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { cn } from "@/lib/utils";

/**
 * Manual "Refresh" trigger for Finance Pulse (PRD §7.6). POSTs /api/finance/refresh
 * (read Sheets → categorize labels → deterministic sums → upsert snapshot), then
 * router.refresh() re-runs the server page so the new cached snapshot shows. The
 * same endpoint is also hit by the daily cron.
 *
 * Behavior preserved exactly; restyled as a ShimmerButton with a spin state.
 * If Google Sheets is unconfigured the endpoint returns { skipped } — shown as a
 * subtle hint beside the button.
 */
export function RefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/finance/refresh", { method: "POST" });
      const json = await res.json();
      if (json?.ok && typeof json.data?.skipped === "string") {
        setNote(json.data.skipped);
      } else if (!json?.ok) {
        setNote(json?.error ?? "Refresh failed");
      }
      router.refresh();
    } catch {
      setNote("Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {note && (
        <span className="max-w-[16rem] text-xs text-muted-foreground">{note}</span>
      )}
      <ShimmerButton onClick={onClick} loading={busy} aria-label="Refresh finance snapshot">
        <RefreshCw className={cn("h-4 w-4 text-cyan", busy && "animate-spin")} aria-hidden />
        {busy ? "Refreshing…" : "Refresh"}
      </ShimmerButton>
    </div>
  );
}
