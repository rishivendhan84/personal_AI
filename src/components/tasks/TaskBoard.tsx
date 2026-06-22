"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Columns3, List, LayoutGrid, RefreshCw, Search, Command } from "lucide-react";
import type { Goal, GoalProject, Task, TaskCategory, TaskUrgency } from "@/lib/db/types";
import { EmptyState } from "@/components/ui/page";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { URGENCY, URGENCY_ORDER } from "@/lib/ui";
import { bentoContainer, useReducedMotion } from "@/lib/motion";
import { TaskCard } from "./TaskCard";
import { NewTaskForm } from "./NewTaskForm";
import { CATEGORIES, URGENCY_LABEL } from "./constants";

type View = "kanban" | "list" | "category";

/**
 * The interactive tasks board (PRD §7.4). Owns task state locally so mutations
 * feel instant (optimistic), then PATCHes the server. Default view is Kanban
 * grouped by URGENCY TIER (today/week/month/someday), each column tier-colored.
 * Dragging a card to another tier column updates its `urgency` + `sort_order`.
 * Filters are STRUCTURED (text/category/urgency) — not the Brain's semantic search.
 * Drag-and-drop stays native HTML5; framer-motion adds layout reorder + a clear
 * drop placeholder.
 */
export function TaskBoard({
  initialTasks,
  goals,
  projects,
}: {
  initialTasks: Task[];
  goals: Goal[];
  projects: GoalProject[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [view, setView] = useState<View>("kanban");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overTier, setOverTier] = useState<TaskUrgency | null>(null);
  const [prioritizing, setPrioritizing] = useState(false);
  const reduced = useReducedMotion();

  // Structured filters.
  const [q, setQ] = useState("");
  const [fCategory, setFCategory] = useState<TaskCategory | "">("");
  const [fUrgency, setFUrgency] = useState<TaskUrgency | "">("");

  const goalTitle = useMemo(() => {
    const m = new Map(goals.map((g) => [g.id, g.title]));
    return (id: string | null) => (id ? m.get(id) : undefined);
  }, [goals]);

  // Sort: ai_priority_score desc when present, else sort_order (PRD §7.4).
  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const as = a.ai_priority_score;
      const bs = b.ai_priority_score;
      if (as != null && bs != null) return bs - as;
      if (as != null) return -1;
      if (bs != null) return 1;
      return a.sort_order - b.sort_order;
    });
  }, [tasks]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sorted.filter((t) => {
      if (fCategory && t.category !== fCategory) return false;
      if (fUrgency && t.urgency !== fUrgency) return false;
      if (needle) {
        const hay = `${t.title} ${t.description ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [sorted, q, fCategory, fUrgency]);

  // --- mutation helpers (optimistic, then persist) ---
  function applyLocal(id: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function patchTask(id: string, patch: Partial<Task>) {
    applyLocal(id, patch);
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  async function refreshPriorities() {
    setPrioritizing(true);
    try {
      const res = await fetch("/api/prioritize", { method: "POST" });
      const json = await res.json();
      if (json.ok && Array.isArray(json.data?.tasks)) {
        // Merge fresh scores back into local state without dropping done tasks
        // (prioritize only returns open ones).
        const scores = new Map<string, number>(
          (json.data.tasks as Task[]).map((t) => [t.id, t.ai_priority_score as number])
        );
        setTasks((prev) =>
          prev.map((t) => (scores.has(t.id) ? { ...t, ai_priority_score: scores.get(t.id)! } : t))
        );
      }
    } finally {
      setPrioritizing(false);
    }
  }

  /**
   * Drop handler. In Kanban a drop onto a tier column sets `urgency`; otherwise
   * it just reorders. We recompute sort_order so the dropped task lands above the
   * target group and persist both. Dependency-free per PRD.
   */
  async function handleDrop(target: { urgency?: TaskUrgency }) {
    const id = dragId;
    setDragId(null);
    setOverTier(null);
    if (!id) return;
    const dragged = tasks.find((t) => t.id === id);
    if (!dragged) return;

    const patch: Partial<Task> = {};
    if (target.urgency && target.urgency !== dragged.urgency) patch.urgency = target.urgency;
    // New sort_order = one less than the current min so it floats to the top of
    // its group. Cheap + deterministic; full re-indexing isn't needed here.
    const minOrder = Math.min(0, ...tasks.map((t) => t.sort_order));
    patch.sort_order = minOrder - 1;

    if (Object.keys(patch).length) await patchTask(id, patch);
  }

  function endDrag() {
    setDragId(null);
    setOverTier(null);
  }

  const onCreated = (task: Task) => setTasks((prev) => [task, ...prev]);

  return (
    <div className="space-y-4">
      {/* Toolbar: view switcher + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-chip border border-foreground/10 bg-foreground/[0.03] p-0.5">
          <ViewBtn active={view === "kanban"} onClick={() => setView("kanban")} icon={Columns3} label="Tiers" />
          <ViewBtn active={view === "list"} onClick={() => setView("list")} icon={List} label="List" />
          <ViewBtn active={view === "category"} onClick={() => setView("category")} icon={LayoutGrid} label="Category" />
        </div>

        <ShimmerButton onClick={refreshPriorities} loading={prioritizing}>
          <RefreshCw className={cn("h-4 w-4", prioritizing && "animate-spin")} />
          {prioritizing ? "Scoring…" : "Refresh priorities"}
        </ShimmerButton>

        <div className="ml-auto">
          <NewTaskForm goals={goals} projects={projects} onCreated={onCreated} />
        </div>
      </div>

      {/* Command-menu style structured filter bar (NOT semantic search) */}
      <div className="gradient-border flex flex-wrap items-center gap-2 rounded-panel bg-foreground/[0.02] p-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet" />
          <input
            placeholder="Filter tasks by text…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 w-full rounded-chip border border-foreground/10 bg-foreground/[0.03] pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-violet/50"
          />
        </div>
        <Select
          aria-label="Filter by category"
          className="w-40"
          placeholder="All categories"
          value={fCategory}
          onChange={(v) => setFCategory(v as TaskCategory | "")}
          options={[
            { value: "", label: "All categories" },
            ...CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
        />
        <Select
          aria-label="Filter by tier"
          className="w-40"
          placeholder="All tiers"
          value={fUrgency}
          onChange={(v) => setFUrgency(v as TaskUrgency | "")}
          options={[
            { value: "", label: "All tiers" },
            ...URGENCY_ORDER.map((u) => ({ value: u, label: URGENCY_LABEL[u] })),
          ]}
        />
        <span className="hidden items-center gap-1.5 px-2 text-[11px] text-muted-foreground/70 sm:inline-flex">
          <kbd className="inline-flex items-center gap-0.5 rounded border border-foreground/10 bg-foreground/[0.04] px-1.5 py-0.5 font-mono text-[10px]">
            <Command className="h-3 w-3" />K
          </kbd>
          opens the Brain
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No tasks match"
          hint={tasks.length === 0 ? "Create your first task to get started." : "Try clearing the filters."}
        />
      ) : view === "kanban" ? (
        <KanbanView
          tasks={filtered}
          goalTitle={goalTitle}
          goals={goals}
          projects={projects}
          dragId={dragId}
          overTier={overTier}
          reduced={reduced}
          onDragStart={setDragId}
          onDragEnd={endDrag}
          onTierOver={setOverTier}
          onDropTier={(urgency) => handleDrop({ urgency })}
          onPatch={patchTask}
          onDelete={deleteTask}
        />
      ) : view === "category" ? (
        <CategoryView
          tasks={filtered}
          goalTitle={goalTitle}
          goals={goals}
          projects={projects}
          dragId={dragId}
          reduced={reduced}
          onDragStart={setDragId}
          onDragEnd={endDrag}
          onPatch={patchTask}
          onDelete={deleteTask}
          onDropAny={() => handleDrop({})}
        />
      ) : (
        <ListView
          tasks={filtered}
          goalTitle={goalTitle}
          goals={goals}
          projects={projects}
          dragId={dragId}
          reduced={reduced}
          onDragStart={setDragId}
          onDragEnd={endDrag}
          onPatch={patchTask}
          onDelete={deleteTask}
          onDropAny={() => handleDrop({})}
        />
      )}
    </div>
  );
}

function ViewBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof List;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-sm transition-colors",
        active
          ? "bg-violet/15 text-foreground font-medium ring-1 ring-violet/30"
          : "text-muted-foreground hover:bg-foreground/[0.05]"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

type CardProps = {
  goalTitle: (id: string | null) => string | undefined;
  goals: Goal[];
  projects: GoalProject[];
  dragId: string | null;
  reduced: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onPatch: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
};

/** A clear, animated drop placeholder shown in the hovered column. */
function DropPlaceholder({ hex, reduced }: { hex: string; reduced: boolean }) {
  return (
    <motion.div
      layout={reduced ? false : true}
      initial={reduced ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 44 }}
      exit={reduced ? undefined : { opacity: 0, height: 0 }}
      transition={{ duration: 0.16 }}
      className="rounded-panel border-2 border-dashed"
      style={{ borderColor: `${hex}66`, backgroundColor: `${hex}14` }}
      aria-hidden
    />
  );
}

function KanbanView({
  tasks,
  overTier,
  onTierOver,
  onDropTier,
  reduced,
  ...rest
}: {
  tasks: Task[];
  overTier: TaskUrgency | null;
  onTierOver: (t: TaskUrgency | null) => void;
  onDropTier: (u: TaskUrgency) => void;
  reduced: boolean;
} & CardProps) {
  return (
    <motion.div
      variants={reduced ? undefined : bentoContainer}
      initial={reduced ? false : "hidden"}
      animate={reduced ? false : "show"}
      className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4"
    >
      {URGENCY_ORDER.map((tier) => {
        const u = URGENCY[tier];
        const col = tasks.filter((t) => t.urgency === tier);
        const isOver = overTier === tier;
        return (
          <div
            key={tier}
            onDragOver={(e) => {
              e.preventDefault();
              if (rest.dragId && overTier !== tier) onTierOver(tier);
            }}
            onDrop={() => onDropTier(tier)}
            className={cn(
              "flex min-w-[78vw] shrink-0 snap-start flex-col gap-2 rounded-panel border bg-foreground/[0.015] p-2 transition-colors sm:min-w-0",
              isOver ? "border-foreground/20" : "border-foreground/8"
            )}
            style={isOver ? { backgroundColor: `${u.hex}0d` } : undefined}
          >
            {/* Tier header — colored by URGENCY[tier] */}
            <div className="flex items-center justify-between px-1 py-0.5">
              <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: u.hex }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: u.hex }} />
                {u.label}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{col.length}</span>
            </div>
            <div
              className="h-px w-full"
              style={{ background: `linear-gradient(90deg, ${u.hex}55, transparent)` }}
            />

            <AnimatePresence initial={false}>
              {isOver && rest.dragId && <DropPlaceholder hex={u.hex} reduced={reduced} />}
            </AnimatePresence>

            {col.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                goalTitle={rest.goalTitle(t.goal_id)}
                goals={rest.goals}
                projects={rest.projects}
                onDragStart={rest.onDragStart}
                onDragEnd={rest.onDragEnd}
                onPatch={rest.onPatch}
                onDelete={rest.onDelete}
                dragging={rest.dragId === t.id}
              />
            ))}

            {col.length === 0 && !isOver && (
              <p className="px-1 py-6 text-center text-xs text-muted-foreground/60">Drop here</p>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

function ListView({
  tasks,
  onDropAny,
  reduced,
  ...rest
}: { tasks: Task[]; onDropAny: () => void; reduced: boolean } & CardProps) {
  return (
    <motion.div
      variants={reduced ? undefined : bentoContainer}
      initial={reduced ? false : "hidden"}
      animate={reduced ? false : "show"}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropAny}
      className="flex flex-col gap-2"
    >
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          goalTitle={rest.goalTitle(t.goal_id)}
          goals={rest.goals}
          projects={rest.projects}
          onDragStart={rest.onDragStart}
          onDragEnd={rest.onDragEnd}
          onPatch={rest.onPatch}
          onDelete={rest.onDelete}
          dragging={rest.dragId === t.id}
        />
      ))}
    </motion.div>
  );
}

function CategoryView({
  tasks,
  onDropAny,
  reduced,
  ...rest
}: { tasks: Task[]; onDropAny: () => void; reduced: boolean } & CardProps) {
  const groups = CATEGORIES.map((c) => ({
    category: c,
    items: tasks.filter((t) => t.category === c),
  })).filter((g) => g.items.length > 0);
  return (
    <motion.div
      variants={reduced ? undefined : bentoContainer}
      initial={reduced ? false : "hidden"}
      animate={reduced ? false : "show"}
      className="space-y-4"
    >
      {groups.map((g) => (
        <div key={g.category} onDragOver={(e) => e.preventDefault()} onDrop={onDropAny}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            {g.category}{" "}
            <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">
              · {g.items.length}
            </span>
          </h3>
          <div className="flex flex-col gap-2">
            {g.items.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                goalTitle={rest.goalTitle(t.goal_id)}
                goals={rest.goals}
                projects={rest.projects}
                onDragStart={rest.onDragStart}
                onDragEnd={rest.onDragEnd}
                onPatch={rest.onPatch}
                onDelete={rest.onDelete}
                dragging={rest.dragId === t.id}
              />
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}
