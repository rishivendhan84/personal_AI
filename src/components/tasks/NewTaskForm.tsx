"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Goal, GoalProject, GoalType, Task, TaskCategory, TaskUrgency } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORIES, PRIORITY_OPTIONS, URGENCIES, URGENCY_LABEL } from "./constants";

/**
 * Inline task creator. Optional goal + project picker (PRD §7.4) — projects are
 * filtered to the chosen goal. Kept collapsible so the board stays uncluttered.
 * Supports creating a goal inline so capture never breaks flow.
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
  const [priority, setPriority] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [goalId, setGoalId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);

  // Local goals list so a freshly-created goal can be appended + auto-selected.
  const [localGoals, setLocalGoals] = useState<Goal[]>(goals);
  useEffect(() => setLocalGoals(goals), [goals]);

  // Inline "new goal" mini-form state.
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalType, setNewGoalType] = useState<GoalType>("weekly");
  const [creatingGoal, setCreatingGoal] = useState(false);

  // Projects shown depend on the chosen goal; clear stale project on goal change.
  const goalProjects = useMemo(
    () => projects.filter((p) => p.goal_id === goalId),
    [projects, goalId]
  );
  useEffect(() => setProjectId(""), [goalId]);

  async function createGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    setCreatingGoal(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newGoalTitle.trim(),
          type: newGoalType,
          period_start: new Date().toISOString().slice(0, 10),
        }),
      });
      const json = await res.json();
      if (json.ok && json.data?.goal) {
        const goal = json.data.goal as Goal;
        setLocalGoals((prev) => [goal, ...prev]);
        setGoalId(goal.id); // auto-select the new goal
        setNewGoalTitle("");
        setNewGoalType("weekly");
        setGoalFormOpen(false);
      }
    } finally {
      setCreatingGoal(false);
    }
  }

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
          effort_score: priority ? Number(priority) : null,
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
        setPriority("");
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
          aria-label="Priority"
          className="w-40"
          placeholder="Priority"
          value={priority}
          onChange={(v) => setPriority(v)}
          options={PRIORITY_OPTIONS}
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-auto"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Goal"
          className="w-full sm:w-44"
          value={goalId}
          onChange={(v) => setGoalId(v)}
          options={[
            { value: "", label: "No goal" },
            ...localGoals.map((g) => ({ value: g.id, label: g.title })),
          ]}
        />
        {!goalFormOpen && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setGoalFormOpen(true)}
          >
            <Plus className="h-4 w-4" /> New goal
          </Button>
        )}
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

      {goalFormOpen && (
        <div className="flex flex-wrap items-center gap-2 rounded-panel border border-border bg-accent/40 p-2">
          <Input
            autoFocus
            placeholder="New goal title"
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createGoal(e);
            }}
            className="min-w-[10rem] flex-1"
          />
          <Select
            aria-label="Goal type"
            className="w-32"
            value={newGoalType}
            onChange={(v) => setNewGoalType(v as GoalType)}
            options={[
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ]}
          />
          <Button
            type="button"
            size="sm"
            onClick={createGoal}
            disabled={creatingGoal || !newGoalTitle.trim()}
          >
            {creatingGoal ? "Adding…" : "Add goal"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Cancel new goal"
            onClick={() => {
              setGoalFormOpen(false);
              setNewGoalTitle("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

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
