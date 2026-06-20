"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";

/**
 * Empty-state action: POSTs to /api/cron/brief to assemble + persist today's
 * brief, then refreshes so the dashboard reads the new cache. The ONLY place the
 * dashboard triggers generation — never on load. Restyled as a ShimmerButton.
 */
export function GenerateBriefButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cron/brief", { method: "POST" });
      if (!res.ok) throw new Error(`Brief generation failed (${res.status})`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <ShimmerButton onClick={generate} loading={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 text-violet" />
        )}
        {loading ? "Generating…" : "Generate brief"}
      </ShimmerButton>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
