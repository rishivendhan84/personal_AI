"use client";
import * as React from "react";
import { Hourglass } from "lucide-react";
import Link from "next/link";
import { BentoCard, BentoHeader } from "@/components/ui/bento-card";
import { useFocus } from "@/components/focus/FocusProvider";
import { fmtClock, MODES, MODE_ORDER } from "@/lib/focus";
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
          <div className="space-y-1.5">
            {MODE_ORDER.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => f.start(m)}
                className="flex w-full items-center justify-between gap-2 rounded-chip border border-border bg-accent/40 px-2.5 py-1.5 text-xs transition-colors hover:bg-accent/70"
              >
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: MODES[m].accent }}
                  />
                  {MODES[m].label}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {MODES[m].focusMin}/{MODES[m].breakMin}m
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </BentoCard>
  );
}
