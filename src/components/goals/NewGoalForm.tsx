"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { GoalType } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useReducedMotion, DUR } from "@/lib/motion";
import type { GoalWithDetail } from "@/app/api/goals/route";

/** Inline goal creator (PRD §7.5). Type weekly/monthly with a real period_start
 * date — manual reset only, no auto-rollover. Restyled; behavior unchanged. */
export function NewGoalForm({ onCreated }: { onCreated: (goal: GoalWithDetail) => void }) {
  const reduced = useReducedMotion();
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
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="bg-violet text-white shadow-glow-violet hover:bg-violet-hover"
      >
        <Plus className="h-4 w-4" /> New goal
      </Button>
    );
  }

  return (
    <AnimatePresence>
      <motion.form
        onSubmit={submit}
        initial={reduced ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: DUR.base, ease: [0.22, 1, 0.36, 1] }}
        className="glass gradient-border flex flex-wrap items-end gap-2 rounded-card p-3 shadow-card"
      >
        <Input
          autoFocus
          placeholder="Goal title (e.g. Become Senior Engineer)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-[220px] flex-1"
        />
        <Select
          aria-label="Goal type"
          className="w-36"
          value={type}
          onChange={(v) => setType(v as GoalType)}
          options={[
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
        <Input
          type="date"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          className="w-auto"
        />
        <Button
          type="submit"
          size="sm"
          className="bg-violet text-white hover:bg-violet-hover"
          disabled={saving || !title.trim()}
        >
          {saving ? "Adding…" : "Add"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </motion.form>
    </AnimatePresence>
  );
}
