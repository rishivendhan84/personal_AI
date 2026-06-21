"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GripVertical, Target, Trash2, Zap } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { URGENCY } from "@/lib/ui";
import { useReducedMotion, DUR } from "@/lib/motion";
import { STATUSES, STATUS_LABEL } from "./constants";

/** Short, tabular due date like "Jun 24" — mono, no year noise. */
function fmtDue(due: string | null): string | null {
  if (!due) return null;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

/** Effort 1–5 as five small bars; filled to `score`, rest faint. */
function EffortBars({ score }: { score: number }) {
  const n = Math.max(0, Math.min(5, Math.round(score)));
  return (
    <span className="inline-flex items-end gap-[2px]" title={`Effort ${n}/5`} aria-label={`Effort ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-colors",
            i <= n ? "bg-violet" : "bg-foreground/12"
          )}
          style={{ height: 4 + i * 2 }}
        />
      ))}
    </span>
  );
}

/**
 * One task tile. Premium glass panel with an urgency dot, mono due date, effort
 * bars, optional goal-link badge. Draggable via native HTML5 DnD (drag source);
 * the board owns the drop targets and persists urgency + sort_order on drop.
 * Calm by design: a framer-motion `layout` reorder spring, but NO entry anim.
 */
export function TaskCard({
  task,
  goalTitle,
  onDragStart,
  onDragEnd,
  onPatch,
  onDelete,
  dragging,
}: {
  task: Task;
  goalTitle?: string;
  onDragStart: (id: string) => void;
  onDragEnd?: () => void;
  onPatch: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  dragging?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const reduced = useReducedMotion();
  const u = URGENCY[task.urgency];
  const due = fmtDue(task.due_date);

  // Click the status pill to advance todo → doing → done → todo. Fast, no menu.
  function cycleStatus() {
    const next: TaskStatus = STATUSES[(STATUSES.indexOf(task.status) + 1) % STATUSES.length];
    setBusy(true);
    onPatch(task.id, { status: next });
    setBusy(false);
  }

  return (
    <motion.div
      layout={reduced ? false : "position"}
      transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.6 }}
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragEnd={() => onDragEnd?.()}
      className={cn(
        "glass group relative flex gap-2 rounded-panel border border-foreground/8 p-2.5 text-sm shadow-card",
        "transition-[box-shadow,opacity] duration-150 hover:shadow-glow-violet",
        dragging && "opacity-40",
        task.status === "done" && "opacity-70"
      )}
    >
      {/* Urgency tint rail */}
      <span
        aria-hidden
        className="absolute inset-y-1.5 left-0 w-[3px] rounded-full"
        style={{ backgroundColor: u.hex }}
      />

      <GripVertical className="mt-0.5 ml-1 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/70 active:cursor-grabbing" />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "font-medium leading-snug text-foreground",
              task.status === "done" && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
          <button
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
            className="-mr-1 -mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground/60 opacity-0 transition-all hover:bg-foreground/8 hover:text-danger group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {task.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {/* Status pill — cycle on click */}
          <button
            onClick={cycleStatus}
            disabled={busy}
            className="rounded-chip border border-foreground/10 bg-foreground/[0.03] px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground"
            aria-label="Cycle status"
          >
            {STATUS_LABEL[task.status]}
          </button>

          {/* Urgency dot + label */}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: u.hex }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: u.hex }} />
            {u.label}
          </span>

          <span className="rounded-chip border border-foreground/10 px-2 py-0.5 text-[11px] text-muted-foreground">
            {task.category}
          </span>

          {due && (
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground/90">{due}</span>
          )}

          {task.effort_score != null && <EffortBars score={task.effort_score} />}

          {goalTitle && (
            <span className="inline-flex items-center gap-1 rounded-chip border border-positive/30 bg-positive/10 px-2 py-0.5 text-[11px] font-medium text-positive">
              <Target className="h-3 w-3" />
              <span className="max-w-[10rem] truncate">{goalTitle}</span>
            </span>
          )}

          {task.ai_priority_score != null && (
            <span className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] font-semibold tabular-nums text-violet">
              <Zap className="h-3 w-3" />
              {task.ai_priority_score.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
