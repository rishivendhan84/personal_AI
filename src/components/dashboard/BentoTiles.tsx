"use client";
import { ListChecks, CalendarClock, Target, Wallet } from "lucide-react";
import { BentoCard, BentoHeader } from "@/components/ui/bento-card";
import { CountUp } from "@/components/ui/count-up";
import { URGENCY, URGENCY_ORDER } from "@/lib/ui";
import type { DailyBriefContent, TaskUrgency } from "@/lib/db/types";

/** Tasks tile: open-task counts by urgency tier as tiny colored chips. */
export function TasksTile({ counts }: { counts: Record<TaskUrgency, number> }) {
  const total = URGENCY_ORDER.reduce((s, k) => s + (counts[k] ?? 0), 0);
  return (
    <BentoCard>
      <BentoHeader icon={ListChecks} title="Tasks" href="/tasks" />
      <div className="mb-3 text-2xl font-semibold text-foreground">
        <CountUp value={total} animateOnMount={false} />
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">open</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {URGENCY_ORDER.filter((k) => (counts[k] ?? 0) > 0).map((k) => (
          <span
            key={k}
            className="inline-flex items-center gap-1.5 rounded-chip border border-white/5 bg-white/[0.03] px-2 py-1 text-xs"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: URGENCY[k].hex }} />
            <span className="text-muted-foreground">{URGENCY[k].label}</span>
            <span className="font-mono tabular-nums text-foreground">{counts[k]}</span>
          </span>
        ))}
        {total === 0 && <span className="text-xs text-muted-foreground">All clear.</span>}
      </div>
    </BentoCard>
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
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
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
