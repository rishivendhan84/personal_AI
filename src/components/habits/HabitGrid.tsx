"use client";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page";
import { getBrowserClient } from "@/lib/db/browser";
import { cn } from "@/lib/utils";
import { HabitToggle } from "@/components/habits/HabitToggle";
import { StreakBadge } from "@/components/habits/StreakBadge";
import type { HabitView } from "@/app/api/habits/route";

/**
 * The interactive habit grid (PRD §7.3). Seeded from server-rendered data, then:
 *  - one-tap toggle → optimistic flip → POST /api/habits/log → refetch.
 *  - Supabase Realtime on habit_logs (browser client) keeps devices in sync; if
 *    the browser client is null (unconfigured) we just rely on manual refetch.
 */
export function HabitGrid({ initial }: { initial: HabitView[] }) {
  const [habits, setHabits] = React.useState<HabitView[]>(initial);
  const [pending, setPending] = React.useState<Set<string>>(new Set());

  // Re-pull the authoritative view (recomputes streaks server-side).
  const refetch = React.useCallback(async () => {
    try {
      const res = await fetch("/api/habits", { cache: "no-store" });
      const json = await res.json();
      if (json?.ok && Array.isArray(json.data?.habits)) {
        setHabits(json.data.habits as HabitView[]);
      }
    } catch {
      // Network hiccup — keep current state; next toggle/realtime event recovers.
    }
  }, []);

  // Cross-device sync: any habit_logs change anywhere triggers a refetch.
  React.useEffect(() => {
    const client = getBrowserClient();
    if (!client) return; // realtime unavailable → manual refetch still works.
    const channel = client
      .channel("habit_logs_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habit_logs" },
        () => void refetch()
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [refetch]);

  const toggle = React.useCallback(
    async (view: HabitView) => {
      const id = view.habit.id;
      const next = !view.doneToday;

      // Optimistic: flip done + nudge the current streak so the UI feels instant.
      setHabits((prev) =>
        prev.map((h) =>
          h.habit.id === id
            ? {
                ...h,
                doneToday: next,
                currentStreak: Math.max(0, h.currentStreak + (next ? 1 : -1)),
              }
            : h
        )
      );
      setPending((p) => new Set(p).add(id));

      try {
        await fetch("/api/habits/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitId: id, done: next }),
        });
        await refetch(); // reconcile streaks with the deterministic server calc.
      } catch {
        await refetch(); // on error, snap back to server truth.
      } finally {
        setPending((p) => {
          const n = new Set(p);
          n.delete(id);
          return n;
        });
      }
    },
    [refetch]
  );

  if (habits.length === 0) {
    return (
      <EmptyState
        title="No habits yet"
        hint="Default habits are seeded via the database migration (Gym, Reading, Deep Work, …)."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {habits.map((view) => (
        <Card
          key={view.habit.id}
          className={cn(
            "flex items-center gap-4 p-4 transition-colors",
            view.doneToday && "border-emerald-600/40 bg-emerald-600/5"
          )}
        >
          <HabitToggle
            done={view.doneToday}
            pending={pending.has(view.habit.id)}
            onToggle={() => void toggle(view)}
            label={view.habit.name}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-medium">{view.habit.name}</h3>
            </div>
            {view.habit.target && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {view.habit.target}
              </p>
            )}
            <StreakBadge
              current={view.currentStreak}
              longest={view.longestStreak}
              className="mt-2"
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
