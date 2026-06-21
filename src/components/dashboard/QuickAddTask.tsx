"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { URGENCY, URGENCY_ORDER } from "@/lib/ui";
import type { TaskUrgency } from "@/lib/db/types";
import { cn } from "@/lib/utils";

/**
 * Always-visible quick-capture on the dashboard. Type a title → POST /api/tasks
 * { title, urgency } → router.refresh(). Urgency defaults to "today" (the user's
 * primary inbox), with a compact Select to retier. Subtle pending state.
 */
export function QuickAddTask({ className }: { className?: string }) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [urgency, setUrgency] = React.useState<TaskUrgency>("today");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, urgency }),
      });
      if (!res.ok) throw new Error(`Couldn't add task (${res.status})`);
      setTitle("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={add} className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Quick-add a task…"
          aria-label="Quick-add a task"
          disabled={busy}
          className="h-10 flex-1"
        />
        <div className="w-28 shrink-0">
          <Select
            value={urgency}
            onChange={(v) => setUrgency(v as TaskUrgency)}
            aria-label="Urgency"
            options={URGENCY_ORDER.map((k) => ({ value: k, label: URGENCY[k].label }))}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !title.trim()}
          aria-label="Add task"
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-chip border border-violet/30 bg-violet/15 text-violet transition-colors",
            "hover:bg-violet/25 disabled:cursor-not-allowed disabled:opacity-40"
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
