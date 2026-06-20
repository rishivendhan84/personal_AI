"use client";

import { useMemo, useState } from "react";
import { Columns3, List, LayoutGrid, RefreshCw, Search } from "lucide-react";
import type { Goal, GoalProject, Task, TaskCategory, TaskStatus, TaskUrgency } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/page";
import { cn } from "@/lib/utils";
import { TaskCard } from "./TaskCard";
import { NewTaskForm } from "./NewTaskForm";
import {
  CATEGORIES,
  STATUSES,
  STATUS_LABEL,
  URGENCIES,
  URGENCY_LABEL,
} from "./constants";

type View = "kanban" | "list" | "category";
const SELECT = "h-9 rounded-md border border-input bg-transparent px-2 text-sm";

/**
 * The interactive tasks board (PRD §7.4). Owns task state locally so mutations
 * feel instant (optimistic), then PATCHes the server. View switcher: Kanban
 * (columns by status), List, Category. Filters are STRUCTURED (text/category/
 * urgency) — not the Brain's semantic search. Drag-and-drop is native HTML5.
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
  const [prioritizing, setPrioritizing] = useState(false);

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
   * Drop handler. In Kanban a drop onto a status column sets status; otherwise it
   * just reorders. We also recompute sort_order so the dropped task lands above
   * the target group and persist both. Dependency-free per PRD.
   */
  async function handleDrop(target: { status?: TaskStatus }) {
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const dragged = tasks.find((t) => t.id === id);
    if (!dragged) return;

    const patch: Partial<Task> = {};
    if (target.status && target.status !== dragged.status) patch.status = target.status;
    // New sort_order = one less than the current min so it floats to the top of
    // its group. Cheap + deterministic; full re-indexing isn't needed here.
    const minOrder = Math.min(0, ...tasks.map((t) => t.sort_order));
    patch.sort_order = minOrder - 1;

    if (Object.keys(patch).length) await patchTask(id, patch);
  }

  const onCreated = (task: Task) => setTasks((prev) => [task, ...prev]);

  return (
    <div className="space-y-4">
      {/* Toolbar: view switcher + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border p-0.5">
          <ViewBtn active={view === "kanban"} onClick={() => setView("kanban")} icon={Columns3} label="Kanban" />
          <ViewBtn active={view === "list"} onClick={() => setView("list")} icon={List} label="List" />
          <ViewBtn active={view === "category"} onClick={() => setView("category")} icon={LayoutGrid} label="Category" />
        </div>
        <Button variant="outline" size="sm" onClick={refreshPriorities} disabled={prioritizing}>
          <RefreshCw className={cn("h-4 w-4", prioritizing && "animate-spin")} />
          {prioritizing ? "Scoring…" : "Refresh priorities"}
        </Button>
        <div className="ml-auto">
          <NewTaskForm goals={goals} projects={projects} onCreated={onCreated} />
        </div>
      </div>

      {/* Structured filter box (NOT semantic search) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by text…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <select
          className={SELECT}
          value={fCategory}
          onChange={(e) => setFCategory(e.target.value as TaskCategory | "")}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className={SELECT}
          value={fUrgency}
          onChange={(e) => setFUrgency(e.target.value as TaskUrgency | "")}
        >
          <option value="">All urgencies</option>
          {URGENCIES.map((u) => (
            <option key={u} value={u}>
              {URGENCY_LABEL[u]}
            </option>
          ))}
        </select>
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
          dragId={dragId}
          onDragStart={setDragId}
          onDropColumn={(status) => handleDrop({ status })}
          onPatch={patchTask}
          onDelete={deleteTask}
        />
      ) : view === "category" ? (
        <CategoryView
          tasks={filtered}
          goalTitle={goalTitle}
          dragId={dragId}
          onDragStart={setDragId}
          onPatch={patchTask}
          onDelete={deleteTask}
          onDropAny={() => handleDrop({})}
        />
      ) : (
        <ListView
          tasks={filtered}
          goalTitle={goalTitle}
          dragId={dragId}
          onDragStart={setDragId}
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
        "flex items-center gap-1.5 rounded px-2.5 py-1 text-sm transition-colors",
        active ? "bg-secondary text-secondary-foreground font-medium" : "text-muted-foreground hover:bg-accent"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

type CardProps = {
  goalTitle: (id: string | null) => string | undefined;
  dragId: string | null;
  onDragStart: (id: string) => void;
  onPatch: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
};

function KanbanView({
  tasks,
  onDropColumn,
  ...rest
}: { tasks: Task[]; onDropColumn: (s: TaskStatus) => void } & CardProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {STATUSES.map((status) => {
        const col = tasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropColumn(status)}
            className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2"
          >
            <div className="flex items-center justify-between px-1 text-sm font-medium">
              <span>{STATUS_LABEL[status]}</span>
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            {col.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                goalTitle={rest.goalTitle(t.goal_id)}
                onDragStart={rest.onDragStart}
                onPatch={rest.onPatch}
                onDelete={rest.onDelete}
                dragging={rest.dragId === t.id}
              />
            ))}
            {col.length === 0 && (
              <p className="px-1 py-3 text-center text-xs text-muted-foreground">Drop here</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ListView({
  tasks,
  onDropAny,
  ...rest
}: { tasks: Task[]; onDropAny: () => void } & CardProps) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropAny}
      className="flex flex-col gap-2"
    >
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          goalTitle={rest.goalTitle(t.goal_id)}
          onDragStart={rest.onDragStart}
          onPatch={rest.onPatch}
          onDelete={rest.onDelete}
          dragging={rest.dragId === t.id}
        />
      ))}
    </div>
  );
}

function CategoryView({
  tasks,
  onDropAny,
  ...rest
}: { tasks: Task[]; onDropAny: () => void } & CardProps) {
  const groups = CATEGORIES.map((c) => ({ category: c, items: tasks.filter((t) => t.category === c) })).filter(
    (g) => g.items.length > 0
  );
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.category} onDragOver={(e) => e.preventDefault()} onDrop={onDropAny}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            {g.category} <span className="font-normal">· {g.items.length}</span>
          </h3>
          <div className="flex flex-col gap-2">
            {g.items.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                goalTitle={rest.goalTitle(t.goal_id)}
                onDragStart={rest.onDragStart}
                onPatch={rest.onPatch}
                onDelete={rest.onDelete}
                dragging={rest.dragId === t.id}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
