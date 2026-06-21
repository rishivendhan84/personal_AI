"use client";
import * as React from "react";
import { MapPin, Crosshair, CalendarClock, Flame, CheckCircle2 } from "lucide-react";
import { BentoCard } from "@/components/ui/bento-card";
import { Spotlight } from "@/components/ui/spotlight";
import { SplitText } from "@/components/ui/shiny-text";
import { CountUp } from "@/components/ui/count-up";
import { Clock } from "./Clock";
import { URGENCY, USER_TZ, greeting } from "@/lib/ui";
import type { DailyBriefContent, TaskUrgency } from "@/lib/db/types";

type Top3Item = DailyBriefContent["top3"][number] & { urgency?: TaskUrgency };

/**
 * The Operator hero — the showpiece of the dashboard. Spans 2×2, carries the
 * spotlight + at-rest glow, an editorial serif greeting (revealed once), a live
 * clock, focus/location chips, AI-ranked top-3, a calendar peek, habit dots, and
 * count-up stats. Pure presentational client component; data comes from the
 * cached brief read server-side.
 */
export function OperatorHero({
  name,
  focus,
  location,
  timeZone = USER_TZ,
  top3,
  calendar,
  habits,
  tasksDoneToday,
  bestStreak,
}: {
  name: string;
  focus: string | null;
  location: string | null;
  timeZone?: string;
  top3: Top3Item[];
  calendar: DailyBriefContent["calendar"];
  habits: DailyBriefContent["habits"];
  tasksDoneToday: number;
  bestStreak: number;
}) {
  const hello = greeting(new Date(), timeZone);
  const nextEvents = calendar.slice(0, 3);
  const habitsDone = habits.filter((h) => h.done).length;

  return (
    <BentoCard glow span="md:col-span-2 md:row-span-2" className="p-0">
      <Spotlight className="h-full">
        <div className="flex h-full flex-col gap-6 p-6 sm:p-7">
          {/* Greeting + clock */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              <SplitText text={`${hello}, ${name}`} />
            </h1>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Clock timeZone={timeZone} />
            </div>
          </div>

          {/* Focus pill + location chip */}
          <div className="flex flex-wrap items-center gap-2">
            {focus && (
              <span className="inline-flex items-center gap-1.5 rounded-chip border border-violet/30 bg-violet/10 px-3 py-1 text-xs font-medium text-foreground">
                <Crosshair className="h-3.5 w-3.5 text-violet" />
                {focus}
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1.5 rounded-chip border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-cyan" />
                {location}
              </span>
            )}
          </div>

          {/* Top-3 AI-ranked tasks */}
          <div className="min-w-0 flex-1">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Today&apos;s priorities
            </p>
            {top3.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing ranked yet — capture a task to get going.
              </p>
            ) : (
              <ol className="space-y-2.5">
                {top3.map((t, i) => {
                  const tier = (t.urgency && URGENCY[t.urgency]) || URGENCY.week;
                  const hex = tier?.hex ?? "#7C5CFC";
                  return (
                    <li
                      key={t.id}
                      className="relative flex items-start gap-3 overflow-hidden rounded-panel border border-white/5 bg-white/[0.02] py-2.5 pl-4 pr-3"
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-[3px]"
                        style={{ background: hex, boxShadow: `0 0 12px ${hex}` }}
                      />
                      <span className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-snug text-foreground">
                          {t.title}
                        </p>
                        {t.reason && (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {t.reason}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Calendar peek + habit dots */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5 text-violet" />
                Up next
              </p>
              {nextEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No events today.</p>
              ) : (
                <ul className="space-y-1.5">
                  {nextEvents.map((e, i) => (
                    <li key={`${e.title}-${i}`} className="flex items-baseline gap-2 text-sm">
                      <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {fmtTime(e.start_at, timeZone)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-foreground">{e.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-positive" />
                Habits
                {habits.length > 0 && (
                  <span className="font-mono tabular-nums text-muted-foreground/70">
                    {habitsDone}/{habits.length}
                  </span>
                )}
              </p>
              {habits.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active habits.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {habits.map((h, i) => (
                    <span
                      key={`${h.name}-${i}`}
                      title={`${h.name}${h.done ? " — done" : ""}`}
                      className={
                        "h-3 w-3 rounded-full transition-colors " +
                        (h.done
                          ? "bg-positive shadow-[0_0_8px_rgba(74,222,128,0.5)]"
                          : "border border-white/15 bg-white/[0.03]")
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hero stats — count up once on load */}
          <div className="flex items-center gap-6 border-t border-white/5 pt-4">
            <Stat
              icon={<CheckCircle2 className="h-4 w-4 text-positive" />}
              label="Done today"
              value={tasksDoneToday}
            />
            <Stat
              icon={<Flame className="h-4 w-4 text-caution" />}
              label="Best streak"
              value={bestStreak}
              suffix={bestStreak === 1 ? " day" : " days"}
            />
          </div>
        </div>
      </Spotlight>
    </BentoCard>
  );
}

function Stat({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <div className="leading-tight">
        <div className="text-xl font-semibold text-foreground">
          <CountUp value={value} animateOnMount suffix={suffix} />
        </div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
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
