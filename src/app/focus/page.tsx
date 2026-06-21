"use client";
import * as React from "react";
import { Play, Pause, RotateCcw, SkipForward, Timer, Flame } from "lucide-react";
import { useFocus } from "@/components/focus/FocusProvider";
import { Hourglass } from "@/components/focus/Hourglass";
import { BentoCard, BentoHeader } from "@/components/ui/bento-card";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page";
import { MODES, MODE_ORDER, type FocusMode } from "@/lib/focus";
import { cn } from "@/lib/utils";
import type { FocusView } from "@/app/api/focus/route";

const BREAK_ACCENT = "#34D399";

export default function FocusPage() {
  const f = useFocus();
  const [stats, setStats] = React.useState<FocusView>({ todaySessions: 0, todayMinutes: 0, recent: [] });

  const refreshStats = React.useCallback(async () => {
    try {
      const res = await fetch("/api/focus", { cache: "no-store" });
      const json = await res.json();
      if (json?.data) setStats(json.data as FocusView);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    void refreshStats();
  }, [refreshStats]);
  // Re-pull stats whenever a focus block completes (phase leaves "focus").
  React.useEffect(() => {
    if (f.phase !== "focus") void refreshStats();
  }, [f.phase, refreshStats]);

  const accent = f.phase === "break" ? BREAK_ACCENT : MODES[f.mode].accent;
  const phaseLabel = f.phase === "focus" ? "Focus" : f.phase === "break" ? "Break" : "Ready";
  const idle = f.phase === "idle";

  return (
    <>
      <PageHeader
        title="Focus"
        description="Time-boxed work sessions with breaks — pick a mode and let the sand run."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Hourglass + controls */}
        <BentoCard glow span="lg:col-span-2" className="flex flex-col items-center gap-6 py-8">
          {f.taskTitle && (
            <p className="max-w-md truncate text-center text-sm text-muted-foreground">
              Focusing on <span className="text-foreground">{f.taskTitle}</span>
            </p>
          )}
          <Hourglass
            progress={f.progress}
            remainingMs={f.remainingMs}
            accent={accent}
            running={f.running}
            label={phaseLabel}
          />

          <div className="flex flex-wrap items-center justify-center gap-2">
            {idle ? (
              <ShimmerButton onClick={() => f.start()} className="h-10 px-6">
                <Play className="h-4 w-4 text-violet" /> Start {MODES[f.mode].label}
              </ShimmerButton>
            ) : f.running ? (
              <ShimmerButton onClick={f.pause} className="h-10 px-6">
                <Pause className="h-4 w-4 text-violet" /> Pause
              </ShimmerButton>
            ) : (
              <ShimmerButton onClick={f.resume} className="h-10 px-6">
                <Play className="h-4 w-4 text-violet" /> Resume
              </ShimmerButton>
            )}
            {!idle && (
              <Button variant="outline" size="lg" onClick={f.skip} aria-label="Skip phase">
                <SkipForward className="h-4 w-4" /> Skip
              </Button>
            )}
            {!idle && (
              <Button variant="ghost" size="lg" onClick={f.reset} aria-label="Reset">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            )}
          </div>

          {/* Focus target */}
          <div className="w-full max-w-sm">
            <Input
              value={f.taskTitle ?? ""}
              onChange={(e) => f.setTask(e.target.value || null)}
              placeholder="What are you focusing on? (optional)"
              className="text-center"
            />
          </div>
        </BentoCard>

        {/* Mode picker + stats */}
        <div className="flex flex-col gap-4">
          <BentoCard>
            <BentoHeader icon={Timer} title="Mode" />
            <div className="space-y-2">
              {MODE_ORDER.map((m) => (
                <ModeCard
                  key={m}
                  mode={m}
                  active={f.mode === m}
                  disabled={!idle}
                  onSelect={() => f.setMode(m)}
                />
              ))}
            </div>
            {!idle && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Finish or reset the current session to switch modes.
              </p>
            )}
          </BentoCard>

          <BentoCard>
            <BentoHeader icon={Flame} title="Today" />
            <div className="flex items-end gap-6">
              <div>
                <div className="font-mono text-3xl font-semibold tabular-nums text-foreground">
                  {stats.todayMinutes}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  focus minutes
                </div>
              </div>
              <div>
                <div className="font-mono text-3xl font-semibold tabular-nums text-foreground">
                  {stats.todaySessions}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  sessions
                </div>
              </div>
            </div>
            {stats.recent.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
                {stats.recent.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-muted-foreground">
                      {s.task_title || MODES[s.mode]?.label || s.mode}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums text-foreground">{s.minutes}m</span>
                  </li>
                ))}
              </ul>
            )}
          </BentoCard>
        </div>
      </div>
    </>
  );
}

function ModeCard({
  mode,
  active,
  disabled,
  onSelect,
}: {
  mode: FocusMode;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const d = MODES[mode];
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled && !active}
      className={cn(
        "w-full rounded-panel border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-violet/50 bg-violet/10"
          : "border-border bg-accent/30 hover:bg-accent/50"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: d.accent }} />
          {d.label}
        </span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {d.focusMin}/{d.breakMin}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{d.blurb}</p>
    </button>
  );
}
