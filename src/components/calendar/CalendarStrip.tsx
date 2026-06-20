"use client";
import * as React from "react";
import {
  addDays,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page";
import type { CalendarEvent } from "@/lib/db/types";

/**
 * Read-only calendar (PRD §7.2): a 14-day horizontal strip that auto-scrolls to
 * today; clicking a day lists that day's events with a current-time marker on
 * today. NON-GOALS: no create/edit. Source is the cached `calendar_events`
 * passed from the server page — this component never fetches AI.
 */
export function CalendarStrip({
  events,
  startISO,
  days = 14,
}: {
  events: CalendarEvent[];
  startISO: string; // first day of the window (ISO), computed server-side
  days?: number;
}) {
  const start = React.useMemo(() => startOfDay(parseISO(startISO)), [startISO]);
  const window = React.useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(start, i)),
    [start, days]
  );

  // Default selection is today if it's in-window, else the first day.
  const [selected, setSelected] = React.useState<Date>(
    () => window.find((d) => isToday(d)) ?? window[0]
  );

  const stripRef = React.useRef<HTMLDivElement>(null);
  const todayRef = React.useRef<HTMLButtonElement>(null);

  // Auto-scroll the strip to bring today into view on mount.
  React.useEffect(() => {
    todayRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  // Group events by day-key once for cheap per-day counts + filtering.
  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = format(parseISO(e.start_at), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const dayEvents = byDay.get(format(selected, "yyyy-MM-dd")) ?? [];

  return (
    <div className="space-y-4">
      {/* 14-day strip */}
      <div
        ref={stripRef}
        className="flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="14-day calendar"
      >
        {window.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const count = byDay.get(key)?.length ?? 0;
          const active = isSameDay(d, selected);
          const today = isToday(d);
          return (
            <button
              key={key}
              ref={today ? todayRef : undefined}
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(startOfDay(d))}
              className={cn(
                "flex min-w-[3.75rem] shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-center transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent hover:text-accent-foreground",
                today && !active && "border-primary/50"
              )}
            >
              <span className="text-[10px] uppercase opacity-70">{format(d, "EEE")}</span>
              <span className="text-lg font-semibold leading-none tabular-nums">
                {format(d, "d")}
              </span>
              <span className="text-[10px] opacity-70">{format(d, "MMM")}</span>
              <span
                className={cn(
                  "mt-0.5 h-1.5 w-1.5 rounded-full",
                  count > 0 ? (active ? "bg-primary-foreground" : "bg-primary") : "bg-transparent"
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      {/* Day detail */}
      <Card className="p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">
            {format(selected, "EEEE, MMMM d")}
            {isToday(selected) && (
              <span className="ml-2 text-xs font-normal text-primary">Today</span>
            )}
          </h2>
          <span className="text-xs text-muted-foreground">
            {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
          </span>
        </div>
        <DayDetail events={dayEvents} isToday={isToday(selected)} />
      </Card>
    </div>
  );
}

/** Event list for the selected day, with a live now-marker when it's today. */
function DayDetail({ events, isToday: today }: { events: CalendarEvent[]; isToday: boolean }) {
  // Live clock only matters for the now-marker; re-render once a minute.
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    if (!today) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [today]);

  if (events.length === 0) {
    return <EmptyState title="No events" hint="Nothing scheduled for this day." />;
  }

  // Decide where the now-marker sits: before the first event that starts after now.
  const markerIndex =
    today && now ? events.findIndex((e) => parseISO(e.start_at) > now) : -1;

  return (
    <ul className="space-y-2">
      {events.map((e, i) => (
        <React.Fragment key={e.id}>
          {markerIndex === i && <NowMarker now={now!} />}
          <li className="flex items-baseline gap-3 rounded-md border border-border/60 p-2.5">
            <span className="w-28 shrink-0 text-xs tabular-nums text-muted-foreground">
              {format(parseISO(e.start_at), "p")}
              {e.end_at ? ` – ${format(parseISO(e.end_at), "p")}` : ""}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{e.title}</p>
              {e.location && (
                <p className="truncate text-xs text-muted-foreground">{e.location}</p>
              )}
            </div>
          </li>
        </React.Fragment>
      ))}
      {/* now is after every event today → marker at the end */}
      {today && now && markerIndex === -1 && <NowMarker now={now} />}
    </ul>
  );
}

function NowMarker({ now }: { now: Date }) {
  return (
    <li className="flex items-center gap-2" aria-label="current time">
      <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
      <span className="text-[10px] font-medium uppercase tracking-wide text-destructive">
        Now · {format(now, "p")}
      </span>
      <span className="h-px flex-1 bg-destructive/40" />
    </li>
  );
}
