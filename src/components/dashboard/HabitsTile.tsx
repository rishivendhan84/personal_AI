"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Check, Flame, Loader2 } from "lucide-react";
import { BentoCard, BentoHeader } from "@/components/ui/bento-card";
import { ClickSpark } from "@/components/ui/click-spark";
import { useReducedMotion, DUR } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface DashHabit {
  id: string;
  name: string;
  done: boolean;
}

/**
 * Interactive Habits tile — the headline interaction. Renders the user's actual
 * habits (with ids) and lets them tap to complete / un-complete *inline* from
 * the dashboard. Optimistic local state + a violet click-spark on completion,
 * then router.refresh() so streaks/stats re-derive server-side. Reduced-motion
 * aware. Calls POST /api/habits/log { habitId, done }.
 */
export function HabitsTile({
  habits: initial,
  bestStreak,
}: {
  habits: DashHabit[];
  bestStreak: number;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [habits, setHabits] = React.useState<DashHabit[]>(initial);
  const [pending, setPending] = React.useState<Set<string>>(new Set());

  // Keep local state in sync when the server payload changes (after refresh).
  React.useEffect(() => setHabits(initial), [initial]);

  const done = habits.filter((h) => h.done).length;

  async function toggle(h: DashHabit) {
    if (pending.has(h.id)) return;
    const next = !h.done;
    // Optimistic flip.
    setHabits((prev) => prev.map((x) => (x.id === h.id ? { ...x, done: next } : x)));
    setPending((p) => new Set(p).add(h.id));
    try {
      const res = await fetch("/api/habits/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: h.id, done: next }),
      });
      if (!res.ok) throw new Error(`log failed (${res.status})`);
      router.refresh();
    } catch {
      // Roll back on failure.
      setHabits((prev) => prev.map((x) => (x.id === h.id ? { ...x, done: !next } : x)));
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(h.id);
        return n;
      });
    }
  }

  return (
    <BentoCard>
      <BentoHeader icon={CheckCircle2} title="Habits" href="/habits" />
      {habits.length === 0 ? (
        <p className="text-xs text-muted-foreground">No active habits.</p>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {habits.map((h) => {
            const busy = pending.has(h.id);
            return (
              <li key={h.id}>
                <ClickSpark
                  color="#7C5CFC"
                  onClick={() => toggle(h)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-panel border border-foreground/5 bg-foreground/[0.02] px-3 py-2.5 text-left transition-colors",
                    "hover:bg-foreground/[0.05] active:bg-foreground/[0.07]",
                    h.done && "border-positive/20 bg-positive/[0.06]"
                  )}
                >
                  <span aria-hidden className="relative grid h-6 w-6 shrink-0 place-items-center">
                    <span
                      className={cn(
                        "absolute inset-0 rounded-full border transition-colors",
                        h.done
                          ? "border-positive bg-positive shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                          : "border-foreground/20 bg-foreground/[0.03]"
                      )}
                    />
                    {h.done && (
                      <motion.span
                        initial={reduced ? false : { scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 18 }}
                        className="relative"
                      >
                        <Check className="h-3.5 w-3.5 text-black" strokeWidth={3} />
                      </motion.span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm",
                      h.done ? "text-muted-foreground line-through" : "text-foreground"
                    )}
                  >
                    {h.name}
                  </span>
                  {busy && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-violet" />}
                </ClickSpark>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <span className="font-mono tabular-nums text-foreground">{done}</span>/
          <span className="font-mono tabular-nums">{habits.length}</span> today
        </span>
        <span className="inline-flex items-center gap-1">
          <Flame className="h-3.5 w-3.5 text-caution" />
          best <span className="font-mono tabular-nums text-foreground">{bestStreak}</span>d
        </span>
      </div>
    </BentoCard>
  );
}

/** Compact tap targets used inside the Operator hero (no card chrome). */
export function HeroHabitChips({ habits: initial }: { habits: DashHabit[] }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [habits, setHabits] = React.useState<DashHabit[]>(initial);
  const [pending, setPending] = React.useState<Set<string>>(new Set());

  React.useEffect(() => setHabits(initial), [initial]);

  async function toggle(h: DashHabit) {
    if (pending.has(h.id)) return;
    const next = !h.done;
    setHabits((prev) => prev.map((x) => (x.id === h.id ? { ...x, done: next } : x)));
    setPending((p) => new Set(p).add(h.id));
    try {
      const res = await fetch("/api/habits/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: h.id, done: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.refresh();
    } catch {
      setHabits((prev) => prev.map((x) => (x.id === h.id ? { ...x, done: !next } : x)));
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(h.id);
        return n;
      });
    }
  }

  if (habits.length === 0) {
    return <p className="text-xs text-muted-foreground">No active habits.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {habits.map((h) => (
        <ClickSpark
          key={h.id}
          color="#7C5CFC"
          onClick={() => toggle(h)}
          className={cn(
            "inline-flex min-h-[34px] items-center gap-1.5 rounded-chip border px-2.5 py-1 text-xs transition-colors",
            h.done
              ? "border-positive/30 bg-positive/10 text-foreground"
              : "border-foreground/10 bg-foreground/[0.03] text-muted-foreground hover:bg-foreground/[0.06]"
          )}
        >
          <motion.span
            aria-hidden
            initial={false}
            animate={reduced ? {} : { scale: h.done ? [1, 1.3, 1] : 1 }}
            transition={{ duration: DUR.base }}
            className={cn(
              "h-3 w-3 shrink-0 rounded-full",
              h.done
                ? "bg-positive shadow-[0_0_8px_rgba(74,222,128,0.5)]"
                : "border border-foreground/20 bg-foreground/[0.03]"
            )}
          />
          <span className="max-w-[8rem] truncate">{h.name}</span>
        </ClickSpark>
      ))}
    </div>
  );
}
