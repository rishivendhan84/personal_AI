"use client";

import { useState } from "react";
import { FolderPlus, RotateCcw, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GoalProject } from "@/lib/db/types";
import type { GoalWithDetail } from "@/app/api/goals/route";

/**
 * One goal with its projects and a deterministic progress bar (% of the goal's
 * tasks that are done — computed server-side, PRD §7.5). Lets you add projects,
 * manually reset the period, and delete. Hierarchy: Goal → Projects → Tasks.
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
      }
    } finally {
      setSaving(false);
    }
  }

  const { pct, done, total } = goal.progress;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate">{goal.title}</CardTitle>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={goal.type === "monthly" ? "secondary" : "outline"}>{goal.type}</Badge>
              <span className="text-xs text-muted-foreground">since {goal.period_start}</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReset(goal.id)} aria-label="Reset period">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(goal.id)} aria-label="Delete goal">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Deterministic progress bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {done}/{total} tasks done
            </span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Projects */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projects</p>
            <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => setAdding((v) => !v)}>
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {goal.projects.length === 0 && !adding && (
            <p className="text-xs text-muted-foreground">No projects yet.</p>
          )}

          {goal.projects.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border border-border px-2 py-1 text-sm"
            >
              <span className="truncate">{p.title}</span>
              {p.status !== "active" && <Badge variant="outline">{p.status}</Badge>}
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
              <Button type="submit" size="sm" className="h-8" disabled={saving || !projTitle.trim()}>
                Add
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
