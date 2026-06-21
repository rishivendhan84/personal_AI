"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  FolderPlus,
  Folder,
  RotateCcw,
  Trash2,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useReducedMotion, DUR } from "@/lib/motion";
import type { GoalProject } from "@/lib/db/types";
import type { GoalWithDetail } from "@/app/api/goals/route";
import { ProgressBar } from "./ProgressBar";

/**
 * One goal as a nested accordion: the goal expands to reveal its projects
 * (Goal → Projects → Tasks hierarchy). Smooth height/opacity expand, chevron
 * rotation, animated progress fill. Restyled create-project / reset / delete
 * actions. Data + API behavior unchanged.
 */
export function GoalCard({
  goal,
  onAddProject,
  onReset,
  onDelete,
}: {
  goal: GoalWithDetail;
  onAddProject: (goalId: string, project: GoalProject) => void;
  onReset: (goalId: string) => void;
  onDelete: (goalId: string) => void;
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [projTitle, setProjTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/goals/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal_id: goal.id, title: projTitle }),
      });
      const json = await res.json();
      if (json.ok && json.data?.project) {
        onAddProject(goal.id, json.data.project as GoalProject);
        setProjTitle("");
        setAdding(false);
        setOpen(true);
      }
    } finally {
      setSaving(false);
    }
  }

  const { pct, done, total } = goal.progress;
  const projectCount = goal.projects.length;

  const expand = reduced
    ? { duration: 0 }
    : { duration: DUR.base, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="glass gradient-border rounded-card p-5 shadow-card transition-shadow duration-150 hover:shadow-glow-violet">
      {/* Header / accordion toggle */}
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="group flex min-w-0 flex-1 items-start gap-2.5 text-left"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-chip bg-violet/15 text-violet">
            <Target className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <motion.span
                animate={{ rotate: open ? 90 : 0 }}
                transition={reduced ? { duration: 0 } : { duration: DUR.fast }}
                className="text-muted-foreground/70"
              >
                <ChevronRight className="h-4 w-4" />
              </motion.span>
              <span className="truncate text-sm font-medium text-foreground">{goal.title}</span>
            </span>
            <span className="mt-1 flex items-center gap-2 pl-[22px]">
              <Badge
                variant="outline"
                className={cn(
                  "border-foreground/10 capitalize",
                  goal.type === "monthly" ? "text-cyan" : "text-violet"
                )}
              >
                {goal.type}
              </Badge>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">
                {projectCount} {projectCount === 1 ? "project" : "projects"} · since {goal.period_start}
              </span>
            </span>
          </span>
        </button>

        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onReset(goal.id)}
            aria-label="Reset period"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-danger"
            onClick={() => onDelete(goal.id)}
            aria-label="Delete goal"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <ProgressBar pct={pct} done={done} total={total} />
      </div>

      {/* Nested projects accordion */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="projects"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={expand}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-1.5 border-t border-foreground/[0.06] pt-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
                  Projects
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1.5 px-1.5 text-muted-foreground hover:text-violet"
                  onClick={() => setAdding((v) => !v)}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {projectCount === 0 && !adding && (
                <p className="text-xs text-muted-foreground/70">No projects yet.</p>
              )}

              {goal.projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-chip border border-foreground/[0.06] bg-foreground/[0.02] px-2.5 py-1.5 text-sm transition-colors hover:border-violet/30"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    <span className="truncate text-foreground/90">{p.title}</span>
                  </span>
                  {p.status !== "active" && (
                    <Badge variant="outline" className="border-foreground/10 capitalize">
                      {p.status}
                    </Badge>
                  )}
                </div>
              ))}

              {adding && (
                <form onSubmit={addProject} className="flex gap-2 pt-1">
                  <Input
                    autoFocus
                    placeholder="Project title"
                    value={projTitle}
                    onChange={(e) => setProjTitle(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 bg-violet text-white hover:bg-violet-hover"
                    disabled={saving || !projTitle.trim()}
                  >
                    Add
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
