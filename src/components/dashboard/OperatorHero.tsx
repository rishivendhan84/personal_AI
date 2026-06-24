"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Crosshair,
  Flame,
  CheckCircle2,
  Loader2,
  Pencil,
  Radar,
} from "lucide-react";
import { BentoCard } from "@/components/ui/bento-card";
import { Spotlight } from "@/components/ui/spotlight";
import { SplitText } from "@/components/ui/shiny-text";
import { CountUp } from "@/components/ui/count-up";
import { Input } from "@/components/ui/input";
import { Clock } from "./Clock";
import { QuickAddTask } from "./QuickAddTask";
import { RadarChart, type RadarDatum } from "./LifeRadar";
import { CalendarPanel } from "./BentoTiles";
import { USER_TZ, greeting, type LifeWeeks } from "@/lib/ui";
import type { DailyBriefContent } from "@/lib/db/types";

/**
 * The Operator hero — the showpiece of the dashboard. Spans 2×2: an editorial
 * serif greeting, a live clock, an editable focus, quick-capture, a calendar
 * peek, habit chips, and count-up stats. (Task priorities live in the Tasks
 * card.) Pure presentational client component; data is read server-side.
 */
export function OperatorHero({
  name,
  focus,
  location,
  timeZone = USER_TZ,
  calendar,
  tasksDoneToday,
  bestStreak,
  radar,
  life,
}: {
  name: string;
  focus: string | null;
  location: string | null;
  timeZone?: string;
  calendar: DailyBriefContent["calendar"];
  tasksDoneToday: number;
  bestStreak: number;
  radar: RadarDatum[];
  life: LifeWeeks;
}) {
  const hello = greeting(new Date(), timeZone);

  return (
    <BentoCard glow className="p-0">
      <Spotlight className="h-full">
        <div className="flex h-full flex-col gap-5 p-6 sm:p-7">
          {/* Greeting + clock */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              <SplitText text={`${hello}, ${name}`} />
            </h1>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Clock timeZone={timeZone} />
            </div>
          </div>

          {/* Focus pill (editable) + location chip + life-in-weeks */}
          <div className="flex flex-wrap items-center gap-2">
            <EditableFocus focus={focus} />
            {location && (
              <span className="inline-flex items-center gap-1.5 rounded-chip border border-border bg-accent/40 px-3 py-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-cyan" />
                {location}
              </span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              ≈{life.lived.toLocaleString()} weeks lived · ≈{life.remaining.toLocaleString()} left
            </span>
          </div>

          {/* Quick-add — always-visible capture */}
          <QuickAddTask />

          {/* Life radar (left) · this-week calendar + day stats (right) */}
          <div className="grid flex-1 items-stretch gap-6 lg:grid-cols-2">
            {/* LEFT — Life radar (vertically centered in its column) */}
            <div className="flex min-w-0 flex-col">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Radar className="h-3.5 w-3.5 text-violet" />
                Life radar
              </p>
              <div className="flex flex-1 items-center justify-center">
                <RadarChart data={radar} />
              </div>
            </div>

            {/* RIGHT — calendar (top) with day stats pinned to the bottom */}
            <div className="flex min-w-0 flex-col">
              <CalendarPanel calendar={calendar} timeZone={timeZone} />
              <div className="mt-auto flex items-center gap-6 border-t border-foreground/5 pt-4">
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
          </div>
        </div>
      </Spotlight>
    </BentoCard>
  );
}

/** Placeholder values we treat as "no focus set yet" (seed/dev leftovers). */
const FOCUS_PLACEHOLDERS = new Set(["ship the paios vertical slice", ""]);

/**
 * Editable focus pill. Click to set today's focus inline; saves via
 * PATCH /api/user then refreshes. Shows a prompt instead of the old seed text.
 */
function EditableFocus({ focus }: { focus: string | null }) {
  const router = useRouter();
  const initial = focus && !FOCUS_PLACEHOLDERS.has(focus.trim().toLowerCase()) ? focus : "";
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setValue(focus && !FOCUS_PLACEHOLDERS.has(focus.trim().toLowerCase()) ? focus : "");
  }, [focus]);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_focus: value.trim() }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-chip border border-violet/40 bg-violet/10 px-2 py-1">
        <Crosshair className="h-3.5 w-3.5 shrink-0 text-violet" />
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => void save()}
          placeholder="What's your focus today?"
          className="h-6 w-56 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
        />
        {saving && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-violet" />}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group inline-flex items-center gap-1.5 rounded-chip border border-violet/30 bg-violet/10 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-violet/20"
    >
      <Crosshair className="h-3.5 w-3.5 text-violet" />
      <span className={value ? "" : "text-muted-foreground"}>
        {value || "Set today's focus"}
      </span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
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
