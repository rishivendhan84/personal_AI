"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Manual "Refresh" trigger for Finance Pulse (PRD §7.6). POSTs /api/finance/refresh
 * (read Sheets → categorize labels → deterministic sums → upsert snapshot), then
 * router.refresh() re-runs the server page so the new cached snapshot shows. The
 * same endpoint is also hit by the daily cron.
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
    <div className="flex items-center gap-2">
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
      <Button variant="outline" size="sm" onClick={onClick} disabled={busy}>
        <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
}
