"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { BentoCard } from "@/components/ui/bento-card";
import { Input } from "@/components/ui/input";
import { getBrowserClient } from "@/lib/db/browser";
import { cn } from "@/lib/utils";
import { bentoContainer } from "@/lib/motion";
import { HabitToggle } from "@/components/habits/HabitToggle";
import { StreakBadge } from "@/components/habits/StreakBadge";
import type { HabitView } from "@/app/api/habits/route";

/**
 * The interactive habit grid (PRD §7.3). Seeded from server-rendered data, then:
 *  - one-tap toggle → optimistic flip → POST /api/habits/log → refetch.
 *  - add / rename / retarget / delete habits inline (POST/PATCH/DELETE /api/habits).
 *  - Supabase Realtime on habit_logs keeps devices in sync; if the browser client
 *    is null (unconfigured) we just rely on manual refetch.
 */
export function HabitGrid({ initial }: { initial: HabitView[] }) {
  const [habits, setHabits] = React.useState<HabitView[]>(initial);
  const [pending, setPending] = React.useState<Set<string>>(new Set());
  const [editingId, setEditingId] = React.useState<string | null>(null);

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

  const addHabit = React.useCallback(async (name: string, target: string) => {
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, target }),
    });
    const json = await res.json();
    if (json?.ok && json.data?.habit) {
      setHabits((prev) => [...prev, json.data.habit as HabitView]);
    }
  }, []);

  const saveEdit = React.useCallback(
    async (id: string, name: string, target: string) => {
      // Optimistic rename so the card updates instantly.
      setHabits((prev) =>
        prev.map((h) =>
          h.habit.id === id
            ? { ...h, habit: { ...h.habit, name, target: target || null } }
            : h
        )
      );
      setEditingId(null);
      try {
        await fetch(`/api/habits/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, target }),
        });
      } catch {
        await refetch();
      }
    },
    [refetch]
  );

  const deleteHabit = React.useCallback(
    async (id: string) => {
      setHabits((prev) => prev.filter((h) => h.habit.id !== id));
      try {
        await fetch(`/api/habits/${id}`, { method: "DELETE" });
      } catch {
        await refetch();
      }
    },
    [refetch]
  );

  return (
    <motion.div
      variants={bentoContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
    >
      {habits.map((view) =>
        editingId === view.habit.id ? (
          <HabitEditor
            key={view.habit.id}
            initialName={view.habit.name}
            initialTarget={view.habit.target ?? ""}
            onCancel={() => setEditingId(null)}
            onSave={(name, target) => void saveEdit(view.habit.id, name, target)}
          />
        ) : (
          <BentoCard
            key={view.habit.id}
            glow={view.doneToday}
            className={cn(
              "flex flex-col items-center gap-4 p-5 text-center sm:p-6",
              view.doneToday && "border-violet/40"
            )}
          >
            {/* Edit / delete — revealed on hover */}
            <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setEditingId(view.habit.id)}
                aria-label={`Edit ${view.habit.name}`}
                className="rounded-chip p-1.5 text-muted-foreground/70 transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete "${view.habit.name}"? Its history will be removed.`))
                    void deleteHabit(view.habit.id);
                }}
                aria-label={`Delete ${view.habit.name}`}
                className="rounded-chip p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger/15 hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <HabitToggle
              done={view.doneToday}
              pending={pending.has(view.habit.id)}
              onToggle={() => void toggle(view)}
              label={view.habit.name}
            />

            <div className="min-w-0 w-full">
              <h3 className="truncate text-sm font-semibold sm:text-base">{view.habit.name}</h3>
              {view.habit.target && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{view.habit.target}</p>
              )}
            </div>

            <StreakBadge
              current={view.currentStreak}
              longest={view.longestStreak}
              className="justify-center"
            />
          </BentoCard>
        )
      )}

      {/* Add-habit tile */}
      <AddHabitTile onAdd={addHabit} />
    </motion.div>
  );
}

/** Inline editor card (shared by edit + add flows). */
function HabitEditor({
  initialName,
  initialTarget,
  onSave,
  onCancel,
  autoFocus = true,
}: {
  initialName: string;
  initialTarget: string;
  onSave: (name: string, target: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const [name, setName] = React.useState(initialName);
  const [target, setTarget] = React.useState(initialTarget);
  const [saving, setSaving] = React.useState(false);

  function submit() {
    if (!name.trim()) return;
    setSaving(true);
    onSave(name.trim(), target.trim());
  }

  return (
    <BentoCard className="flex flex-col justify-center gap-2.5 p-5 sm:p-6">
      <Input
        autoFocus={autoFocus}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Habit name"
        className="h-8 text-sm"
      />
      <Input
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Target (optional, e.g. 30 min)"
        className="h-8 text-xs"
      />
      <div className="mt-1 flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-chip border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-foreground/[0.06]"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim() || saving}
          className="inline-flex items-center gap-1 rounded-chip border border-violet/40 bg-violet/15 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-violet/25 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>
    </BentoCard>
  );
}

/** Dashed "add a habit" tile that expands into the inline editor. */
function AddHabitTile({ onAdd }: { onAdd: (name: string, target: string) => Promise<void> }) {
  const [adding, setAdding] = React.useState(false);

  if (adding) {
    return (
      <HabitEditor
        initialName=""
        initialTarget=""
        onCancel={() => setAdding(false)}
        onSave={async (name, target) => {
          await onAdd(name, target);
          setAdding(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border text-muted-foreground transition-colors hover:border-violet/50 hover:bg-violet/[0.04] hover:text-foreground"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full border border-border">
        <Plus className="h-5 w-5" />
      </span>
      <span className="text-sm font-medium">Add habit</span>
    </button>
  );
}
