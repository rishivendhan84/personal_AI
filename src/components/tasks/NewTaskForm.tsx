"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Goal, GoalProject, Task, TaskCategory, TaskUrgency } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { CATEGORIES, URGENCIES, URGENCY_LABEL } from "./constants";

const SELECT =
  "h-9 rounded-chip border border-white/10 bg-white/[0.03] px-2.5 text-sm text-foreground outline-none transition-colors hover:bg-white/[0.06] focus:border-violet/50";

/**
 * Inline task creator. Optional goal + project picker (PRD §7.4) — projects are
 * filtered to the chosen goal. Kept collapsible so the board stays uncluttered.
 */
export function NewTaskForm({
  goals,
  projects,
  onCreated,
}: {
  goals: Goal[];
  projects: GoalProject[];
  onCreated: (task: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TaskCategory>("Personal");
  const [urgency, setUrgency] = useState<TaskUrgency>("week");
  const [effort, setEffort] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [goalId, setGoalId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);

  // Projects shown depend on the chosen goal; clear stale project on goal change.
  const goalProjects = useMemo(
    () => projects.filter((p) => p.goal_id === goalId),
    [projects, goalId]
  );
  useEffect(() => setProjectId(""), [goalId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          urgency,
          effort_score: effort ? Number(effort) : null,
          due_date: dueDate || null,
          goal_id: goalId || null,
          project_id: projectId || null,
        }),
      });
      const json = await res.json();
      if (json.ok && json.data?.task) {
        onCreated(json.data.task as Task);
        // Reset for the next quick capture; keep category/urgency sticky.
        setTitle("");
        setDescription("");
        setEffort("");
        setDueDate("");
        setGoalId("");
        setProjectId("");
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4" /> New task
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="glass gradient-border space-y-2 rounded-panel p-3 shadow-card"
    >
      <Input
        autoFocus
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="min-h-[56px]"
      />
      <div className="flex flex-wrap gap-2">
        <select
          className={SELECT}
          value={category}
          onChange={(e) => setCategory(e.target.value as TaskCategory)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className={SELECT}
          value={urgency}
          onChange={(e) => setUrgency(e.target.value as TaskUrgency)}
        >
          {URGENCIES.map((u) => (
            <option key={u} value={u}>
              {URGENCY_LABEL[u]}
            </option>
          ))}
        </select>
        <select className={SELECT} value={effort} onChange={(e) => setEffort(e.target.value)}>
          <option value="">Effort</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              Effort {n}
            </option>
          ))}
        </select>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-auto"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select className={SELECT} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
          <option value="">No goal</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <select
          className={SELECT}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          disabled={!goalId || goalProjects.length === 0}
        >
          <option value="">{goalId ? "No project" : "Pick a goal first"}</option>
          {goalProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving || !title.trim()}>
          {saving ? "Adding…" : "Add task"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
