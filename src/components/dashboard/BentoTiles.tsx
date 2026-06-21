"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ListChecks, CalendarClock, Target, Wallet, Check, Loader2 } from "lucide-react";
import { BentoCard, BentoHeader } from "@/components/ui/bento-card";
import { CountUp } from "@/components/ui/count-up";
import { useReducedMotion } from "@/lib/motion";
import { URGENCY, URGENCY_ORDER } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { DailyBriefContent, TaskUrgency } from "@/lib/db/types";

export interface DashTask {
  id: string;
  title: string;
  urgency: TaskUrgency;
}

/**
 * Interactive Tasks tile: the top open tasks (by priority) are completable
 * inline (PATCH /api/tasks/[id] → optimistic check + animate out → refresh),
 * with a tier-count footer. Tap a row's circle to mark it done.
 */
export function TasksTile({
  counts,
  tasks,
}: {
  counts: Record<TaskUrgency, number>;
  tasks: DashTask[];
}) {
  const total = URGENCY_ORDER.reduce((s, k) => s + (counts[k] ?? 0), 0);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const visible = tasks.filter((t) => !hidden.has(t.id));

  return (
    <BentoCard>
      <BentoHeader icon={ListChecks} title="Tasks" href="/tasks" />
      <div className="mb-3 text-2xl font-semibold text-foreground">
        <CountUp value={Math.max(0, total - hidden.size)} animateOnMount={false} />
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">open</span>
      </div>

      {visible.length > 0 ? (
        <ul className="mb-3 space-y-1.5">
          <AnimatePresence initial={false}>
            {visible.slice(0, 4).map((t) => (
              <TaskRow key={t.id} task={t} onDone={() => setHidden((h) => new Set(h).add(t.id))} />
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">All clear — nice.</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {URGENCY_ORDER.filter((k) => (counts[k] ?? 0) > 0).map((k) => (
          <span
            key={k}
            className="inline-flex items-center gap-1.5 rounded-chip border border-border bg-accent/40 px-2 py-1 text-xs"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: URGENCY[k].hex }} />
            <span className="text-muted-foreground">{URGENCY[k].label}</span>
            <span className="font-mono tabular-nums text-foreground">{counts[k]}</span>
          </span>
        ))}
      </div>
    </BentoCard>
  );
}

/** A completable task row inside the Tasks tile. */
function TaskRow({ task, onDone }: { task: DashTask; onDone: () => void }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [done, setDone] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const tier = URGENCY[task.urgency] ?? URGENCY.week;

  async function complete() {
    if (busy || done) return;
    setBusy(true);
    setDone(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setTimeout(() => {
        onDone();
        router.refresh();
      }, reduced ? 0 : 300);
    } catch {
      setDone(false);
      setBusy(false);
    }
  }

  return (
    <motion.li
      layout={!reduced}
      initial={false}
      animate={{ opacity: done ? 0.5 : 1 }}
      exit={reduced ? undefined : { opacity: 0, height: 0 }}
      transition={{ duration: 0.28 }}
      className="flex items-center gap-2.5 rounded-panel border border-border bg-accent/30 px-2.5 py-2"
    >
      <button
        type="button"
        onClick={complete}
        disabled={busy}
        aria-label={`Complete ${task.title}`}
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors",
          done
            ? "border-positive bg-positive"
            : "border-muted-foreground/40 hover:border-positive/60 hover:bg-positive/10"
        )}
      >
        {busy && !done ? (
          <Loader2 className="h-3 w-3 animate-spin text-violet" />
        ) : done ? (
          <Check className="h-3.5 w-3.5 text-black" strokeWidth={3} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: tier.hex }} />
        )}
      </button>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          done ? "text-muted-foreground line-through" : "text-foreground"
        )}
      >
        {task.title}
      </span>
    </motion.li>
  );
}

/** Calendar tile: today's event count + next event time. */
export function CalendarTile({
  calendar,
  timeZone,
}: {
  calendar: DailyBriefContent["calendar"];
  timeZone?: string;
}) {
  const next = calendar[0];
  return (
    <BentoCard>
      <BentoHeader icon={CalendarClock} title="Calendar" href="/calendar" />
      <div className="mb-2 text-2xl font-semibold text-foreground">
        <CountUp value={calendar.length} animateOnMount={false} />
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
          {calendar.length === 1 ? "event" : "events"} today
        </span>
      </div>
      {next ? (
        <p className="flex items-baseline gap-2 text-sm">
          <span className="font-mono text-xs tabular-nums text-violet">
            {fmtTime(next.start_at, timeZone)}
          </span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{next.title}</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Open calendar.</p>
      )}
    </BentoCard>
  );
}

/** Goals tile: active goals with thin accent progress bars. */
export function GoalsTile({ goals }: { goals: DailyBriefContent["goal_progress"] }) {
  return (
    <BentoCard>
      <BentoHeader icon={Target} title="Goals" href="/goals" />
      {goals.length === 0 ? (
        <p className="text-xs text-muted-foreground">No active goals.</p>
      ) : (
        <ul className="space-y-2.5">
          {goals.slice(0, 4).map((g) => (
            <li key={g.title}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-foreground">{g.title}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  {g.pct}%
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                <div
                  className="h-full rounded-full bg-violet"
                  style={{ width: `${Math.min(100, Math.max(0, g.pct))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </BentoCard>
  );
}

/** Finance tile: latest net worth (mono, no count-up on mount). */
export function FinanceTile({ netWorth }: { netWorth: number | null }) {
  return (
    <BentoCard>
      <BentoHeader icon={Wallet} title="Finance" href="/finance" />
      <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Net worth</p>
      {netWorth === null ? (
        <p className="text-2xl font-semibold text-muted-foreground">—</p>
      ) : (
        <div className="text-2xl font-semibold text-foreground">
          <CountUp value={netWorth} animateOnMount={false} prefix="₹" />
        </div>
      )}
    </BentoCard>
  );
}

/** Thin daily-brief banner above the grid: glass with an accent left-border. */
export function BriefBanner({ focus }: { focus: string }) {
  return (
    <div className="glass mb-4 flex items-center gap-3 rounded-panel border-l-2 border-l-violet px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wider text-violet">Focus</span>
      <p className="min-w-0 flex-1 truncate text-sm text-foreground">{focus}</p>
    </div>
  );
}

function fmtTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
