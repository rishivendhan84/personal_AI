"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Crosshair,
  CalendarClock,
  Flame,
  CheckCircle2,
  Check,
  Loader2,
  Pencil,
} from "lucide-react";
import { BentoCard } from "@/components/ui/bento-card";
import { Spotlight } from "@/components/ui/spotlight";
import { SplitText } from "@/components/ui/shiny-text";
import { CountUp } from "@/components/ui/count-up";
import { Input } from "@/components/ui/input";
import { Clock } from "./Clock";
import { HeroHabitChips, type DashHabit } from "./HabitsTile";
import { QuickAddTask } from "./QuickAddTask";
import { URGENCY, USER_TZ, greeting } from "@/lib/ui";
import { useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
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
  habits: DashHabit[];
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

          {/* Focus pill (editable) + location chip */}
          <div className="flex flex-wrap items-center gap-2">
            <EditableFocus focus={focus} />
            {location && (
              <span className="inline-flex items-center gap-1.5 rounded-chip border border-border bg-accent/40 px-3 py-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-cyan" />
                {location}
              </span>
            )}
          </div>

          {/* Top-3 AI-ranked tasks — completable inline */}
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
                <AnimatePresence initial={false}>
                  {top3.map((t, i) => (
                    <Top3Row key={t.id} task={t} index={i} />
                  ))}
                </AnimatePresence>
              </ol>
            )}
          </div>

          {/* Quick-add — always-visible capture */}
          <QuickAddTask />

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
              <HeroHabitChips habits={habits} />
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

/**
 * A single top-3 priority row with an inline circular complete control. Click →
 * PATCH /api/tasks/[id] { status: "done" } → optimistic check + animate out →
 * router.refresh(). Big tap target on phone.
 */
function Top3Row({ task, index }: { task: Top3Item; index: number }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [done, setDone] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const tier = (task.urgency && URGENCY[task.urgency]) || URGENCY.week;
  const hex = tier?.hex ?? "#7C5CFC";

  async function complete(e: React.MouseEvent) {
    e.preventDefault();
    if (busy || done) return;
    setBusy(true);
    setDone(true); // optimistic check
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      // Let the check-off read, then refresh so the brief/counts re-derive.
      setTimeout(() => router.refresh(), reduced ? 0 : 320);
    } catch {
      setDone(false);
      setBusy(false);
    }
  }

  return (
    <motion.li
      layout={!reduced}
      initial={false}
      animate={done ? { opacity: 0.55 } : { opacity: 1 }}
      exit={reduced ? undefined : { opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex items-start gap-3 overflow-hidden rounded-panel border border-white/5 bg-white/[0.02] py-2.5 pl-4 pr-3"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: hex, boxShadow: `0 0 12px ${hex}` }}
      />
      <button
        type="button"
        onClick={complete}
        disabled={busy}
        aria-label={`Complete ${task.title}`}
        className={cn(
          "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors",
          done
            ? "border-positive bg-positive shadow-[0_0_10px_rgba(74,222,128,0.5)]"
            : "border-white/20 bg-white/[0.03] hover:border-positive/60 hover:bg-positive/10"
        )}
      >
        {busy && !done ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-violet" />
        ) : done ? (
          <motion.span
            initial={reduced ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
          >
            <Check className="h-4 w-4 text-black" strokeWidth={3} />
          </motion.span>
        ) : (
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium leading-snug",
            done ? "text-muted-foreground line-through" : "text-foreground"
          )}
        >
          {task.title}
        </p>
        {task.reason && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{task.reason}</p>
        )}
      </div>
    </motion.li>
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

function fmtTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
