"use client";

import { useState } from "react";
import { GripVertical, Target, Trash2, Zap } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/db/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATUSES, STATUS_LABEL, URGENCY_LABEL, URGENCY_VARIANT } from "./constants";

/**
 * One task tile. Draggable via native HTML5 DnD (no library — not in deps).
 * Shows the computed priority score and a goal-link badge; lets you cycle status
 * and delete inline. The board owns drag *targets*; this owns the drag *source*.
 */
export function TaskCard({
  task,
  goalTitle,
  onDragStart,
  onPatch,
  onDelete,
  dragging,
}: {
  task: Task;
  goalTitle?: string;
  onDragStart: (id: string) => void;
  onPatch: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  dragging?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  // Click the status pill to advance todo → doing → done → todo. Fast, no menu.
  function cycleStatus() {
    const next: TaskStatus = STATUSES[(STATUSES.indexOf(task.status) + 1) % STATUSES.length];
    setBusy(true);
    onPatch(task.id, { status: next });
    setBusy(false);
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      className={cn(
        "group flex gap-2 rounded-md border border-border bg-card p-2.5 text-sm shadow-sm transition-opacity",
        dragging && "opacity-40",
        task.status === "done" && "opacity-70"
      )}
    >
      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("font-medium leading-snug", task.status === "done" && "line-through")}>
            {task.title}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {task.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            onClick={cycleStatus}
            disabled={busy}
            className="rounded-full border border-border px-2 py-0.5 text-xs font-medium transition-colors hover:bg-accent"
            aria-label="Cycle status"
          >
            {STATUS_LABEL[task.status]}
          </button>

          <Badge variant={URGENCY_VARIANT[task.urgency]}>{URGENCY_LABEL[task.urgency]}</Badge>
          <Badge variant="outline">{task.category}</Badge>

          {task.effort_score != null && (
            <span className="text-xs text-muted-foreground">effort {task.effort_score}</span>
          )}

          {goalTitle && (
            <Badge variant="success" className="gap-1">
              <Target className="h-3 w-3" />
              {goalTitle}
            </Badge>
          )}

          {task.ai_priority_score != null && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary">
              <Zap className="h-3 w-3" />
              {task.ai_priority_score.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
