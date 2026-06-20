"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { GoalType } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GoalWithDetail } from "@/app/api/goals/route";

const SELECT = "h-9 rounded-md border border-input bg-transparent px-2 text-sm";

/** Inline goal creator (PRD §7.5). Type weekly/monthly with a real period_start
 * date — manual reset only, no auto-rollover. */
export function NewGoalForm({ onCreated }: { onCreated: (goal: GoalWithDetail) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<GoalType>("weekly");
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, period_start: periodStart }),
      });
      const json = await res.json();
      if (json.ok && json.data?.goal) {
        // API returns a bare Goal on create; hydrate it into the card shape.
        onCreated({ ...json.data.goal, projects: [], progress: { total: 0, done: 0, pct: 0 } });
        setTitle("");
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4" /> New goal
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3 shadow-sm"
    >
      <Input
        autoFocus
        placeholder="Goal title (e.g. Become Senior Engineer)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="min-w-[220px] flex-1"
      />
      <select className={SELECT} value={type} onChange={(e) => setType(e.target.value as GoalType)}>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
      <Input
        type="date"
        value={periodStart}
        onChange={(e) => setPeriodStart(e.target.value)}
        className="w-auto"
      />
      <Button type="submit" size="sm" disabled={saving || !title.trim()}>
        {saving ? "Adding…" : "Add"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
