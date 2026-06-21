"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Goal, GoalProject, Task, TaskCategory, TaskUrgency } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORIES, URGENCIES, URGENCY_LABEL } from "./constants";

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
        <Select
          aria-label="Category"
          className="w-36"
          value={category}
          onChange={(v) => setCategory(v as TaskCategory)}
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        <Select
          aria-label="Urgency"
          className="w-36"
          value={urgency}
          onChange={(v) => setUrgency(v as TaskUrgency)}
          options={URGENCIES.map((u) => ({ value: u, label: URGENCY_LABEL[u] }))}
        />
        <Select
          aria-label="Effort"
          className="w-28"
          placeholder="Effort"
          value={effort}
          onChange={(v) => setEffort(v)}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `Effort ${n}` }))}
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-auto"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          aria-label="Goal"
          className="w-full sm:w-44"
          value={goalId}
          onChange={(v) => setGoalId(v)}
          options={[
            { value: "", label: "No goal" },
            ...goals.map((g) => ({ value: g.id, label: g.title })),
          ]}
        />
        <Select
          aria-label="Project"
          className="w-full sm:w-44"
          value={projectId}
          onChange={(v) => setProjectId(v)}
          disabled={!goalId || goalProjects.length === 0}
          options={[
            { value: "", label: goalId ? "No project" : "Pick a goal first" },
            ...goalProjects.map((p) => ({ value: p.id, label: p.title })),
          ]}
        />
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
