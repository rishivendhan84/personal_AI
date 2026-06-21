"use client";
import * as React from "react";
import { Hourglass, Play } from "lucide-react";
import Link from "next/link";
import { BentoCard, BentoHeader } from "@/components/ui/bento-card";
import { useFocus } from "@/components/focus/FocusProvider";
import { fmtClock, MODES } from "@/lib/focus";
import type { FocusView } from "@/app/api/focus/route";

/**
 * Dashboard Focus tile — start a session in one tap from the operator surface,
 * or watch the live countdown when one's running. Shows today's focused minutes.
 */
export function FocusTile() {
  const f = useFocus();
  const [stats, setStats] = React.useState<FocusView>({ todaySessions: 0, todayMinutes: 0, recent: [] });

  React.useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/focus", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => alive && j?.data && setStats(j.data))
        .catch(() => {});
    void load();
    return () => {
      alive = false;
    };
  }, [f.phase]);

  const running = f.phase !== "idle";
  const accent = f.phase === "break" ? "#34D399" : MODES[f.mode].accent;

  return (
    <BentoCard>
      <BentoHeader icon={Hourglass} title="Focus" href="/focus" />
      {running ? (
        <Link href="/focus" className="block">
          <div className="font-mono text-3xl font-semibold tabular-nums" style={{ color: accent }}>
            {fmtClock(f.remainingMs)}
          </div>
          <div className="mt-1 text-xs capitalize text-muted-foreground">
            {f.phase} · {MODES[f.mode].label}
          </div>
        </Link>
      ) : (
        <>
          <div className="mb-3">
            <span className="font-mono text-3xl font-semibold tabular-nums text-foreground">
              {stats.todayMinutes}
            </span>
            <span className="ml-1.5 text-xs text-muted-foreground">min today</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => f.start("quick")}
              className="inline-flex items-center gap-1.5 rounded-chip border border-violet/30 bg-violet/10 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-violet/20"
            >
              <Play className="h-3.5 w-3.5 text-violet" /> Start 25m
            </button>
            <Link
              href="/focus"
              className="inline-flex items-center rounded-chip border border-border bg-accent/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              More modes
            </Link>
          </div>
        </>
      )}
    </BentoCard>
  );
}
