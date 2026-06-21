"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Apple, Plus, Loader2 } from "lucide-react";
import { BentoCard, BentoHeader } from "@/components/ui/bento-card";
import { CountUp } from "@/components/ui/count-up";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Interactive Nutrition tile — keeps the calories-vs-target readout AND adds a
 * quick meal logger right on the dashboard. Type a meal → POST /api/nutrition/log
 * { meal } (server estimates macros) → router.refresh(). Subtle pending state.
 */
export function NutritionTile({
  calories,
  target,
}: {
  calories: number | null;
  target: number | null;
}) {
  const router = useRouter();
  const [meal, setMeal] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const pct =
    calories !== null && target && target > 0
      ? Math.min(100, Math.round((calories / target) * 100))
      : null;

  async function log(e: React.FormEvent) {
    e.preventDefault();
    const m = meal.trim();
    if (!m || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal: m }),
      });
      if (!res.ok) throw new Error(`Couldn't log meal (${res.status})`);
      setMeal("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BentoCard>
      <BentoHeader icon={Apple} title="Nutrition" href="/nutrition" />
      {calories === null ? (
        <p className="mb-3 text-2xl font-semibold text-muted-foreground">—</p>
      ) : (
        <>
          <div className="mb-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-foreground">
              <CountUp value={calories} animateOnMount={false} />
            </span>
            <span className="text-xs text-muted-foreground">
              {target ? (
                <>
                  / <span className="font-mono tabular-nums">{target.toLocaleString()}</span> kcal
                </>
              ) : (
                "kcal"
              )}
            </span>
          </div>
          {pct !== null && (
            <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-cyan" style={{ width: `${pct}%` }} />
            </div>
          )}
        </>
      )}

      <form onSubmit={log} className="flex items-center gap-2">
        <Input
          value={meal}
          onChange={(e) => setMeal(e.target.value)}
          placeholder="Log a meal…"
          aria-label="Log a meal"
          disabled={busy}
          className="h-10 flex-1"
        />
        <button
          type="submit"
          disabled={busy || !meal.trim()}
          aria-label="Log meal"
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-chip border border-cyan/30 bg-cyan/15 text-cyan transition-colors",
            "hover:bg-cyan/25 disabled:cursor-not-allowed disabled:opacity-40"
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </form>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </BentoCard>
  );
}
