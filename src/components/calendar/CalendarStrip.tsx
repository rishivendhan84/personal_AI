"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  addDays,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/page";
import { useReducedMotion, DUR } from "@/lib/motion";
import type { CalendarEvent } from "@/lib/db/types";

/**
 * Read-only calendar (PRD §7.2): a 14-day horizontal snap-scroll strip that
 * auto-scrolls to today; clicking a day expands that day's events below in a
 * glass sheet, with a gently pulsing now-marker on today. NON-GOALS: no
 * create/edit. Source is the cached `calendar_events` passed from the server
 * page — this component never fetches AI. Renders in the browser's local tz.
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

  const selectedKey = format(selected, "yyyy-MM-dd");
  const dayEvents = byDay.get(selectedKey) ?? [];

  return (
    <div className="space-y-4">
      {/* 14-day snap-scroll strip */}
      <div
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                "group relative flex min-w-[4.25rem] shrink-0 snap-start flex-col items-center gap-1 rounded-panel border px-3 py-3 text-center transition-all duration-150",
                "border-white/[0.06] bg-white/[0.02] backdrop-blur",
                "hover:border-white/[0.12] hover:bg-white/[0.05]",
                active && "bg-violet/[0.10] shadow-glow-violet",
                today && "ring-1 ring-inset ring-violet/70"
              )}
            >
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-wider tabular-nums",
                  active ? "text-violet" : "text-muted-foreground/70"
                )}
              >
                {format(d, "EEE")}
              </span>
              <span
                className={cn(
                  "font-mono text-2xl font-semibold leading-none tabular-nums",
                  active ? "text-foreground" : "text-foreground/90"
                )}
              >
                {format(d, "d")}
              </span>
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-wide tabular-nums",
                  active ? "text-violet/80" : "text-muted-foreground/50"
                )}
              >
                {format(d, "MMM")}
              </span>
              <span
                className={cn(
                  "mt-1 h-1.5 w-1.5 rounded-full transition-colors",
                  count > 0
                    ? active
                      ? "bg-violet shadow-[0_0_8px_rgba(124,92,252,0.8)]"
                      : "bg-violet/60"
                    : "bg-transparent"
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      {/* Day detail — glass sheet, expands on day change */}
      <DaySheet
        dayKey={selectedKey}
        selected={selected}
        events={dayEvents}
        isToday={isToday(selected)}
      />
    </div>
  );
}

/** Glass sheet that expands (height/opacity) when the selected day changes. */
function DaySheet({
  dayKey,
  selected,
  events,
  isToday: today,
}: {
  dayKey: string;
  selected: Date;
  events: CalendarEvent[];
  isToday: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="glass gradient-border overflow-hidden rounded-card shadow-card">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={dayKey}
          initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: DUR.base, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {format(selected, "EEEE, MMM d")}
                {today && (
                  <span className="ml-2 rounded-chip bg-violet/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet">
                    Today
                  </span>
                )}
              </h2>
              <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
                {events.length} {events.length === 1 ? "event" : "events"}
              </span>
            </div>
            <DayDetail events={events} isToday={today} />
          </div>
        </motion.div>
      </AnimatePresence>
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
          <li className="flex items-baseline gap-3 rounded-panel border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
            <span className="w-28 shrink-0 font-mono text-xs tabular-nums text-muted-foreground/80">
              {format(parseISO(e.start_at), "p")}
              {e.end_at ? ` – ${format(parseISO(e.end_at), "p")}` : ""}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
              {e.location && (
                <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-chip bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground/80">
                  <MapPin className="h-3 w-3 shrink-0 text-cyan" />
                  <span className="truncate">{e.location}</span>
                </span>
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

/** Gently pulsing current-time marker (the one allowed ambient loop). */
function NowMarker({ now }: { now: Date }) {
  return (
    <li className="flex items-center gap-2 py-0.5 animate-pulse-now" aria-label="current time">
      <span className="h-2 w-2 shrink-0 rounded-full bg-violet shadow-[0_0_10px_rgba(124,92,252,0.9)]" />
      <span className="font-mono text-[10px] font-medium uppercase tracking-wide tabular-nums text-violet">
        Now · {format(now, "p")}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-violet/60 to-transparent" />
    </li>
  );
}
