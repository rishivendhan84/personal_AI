import type { TaskCategory, TaskUrgency, TaskStatus } from "@/lib/db/types";

/** Shared option lists + display accents for the task UI. Centralised so the
 * board, card, form and filters never drift on labels/colors. */

export const CATEGORIES: TaskCategory[] = ["Work", "Learning", "Personal", "Business", "Fitness"];
export const URGENCIES: TaskUrgency[] = ["today", "week", "month", "someday"];
export const STATUSES: TaskStatus[] = ["todo", "doing", "done"];

/**
 * Priority options for the `effort_score` column (int 1–5). Only the LABEL is
 * renamed to "Priority" — the DB column / API field stays `effort_score`.
 * 5 = highest priority.
 */
export const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "1", label: "Priority 1 (low)" },
  { value: "2", label: "Priority 2" },
  { value: "3", label: "Priority 3" },
  { value: "4", label: "Priority 4" },
  { value: "5", label: "Priority 5 (high)" },
];

export const URGENCY_LABEL: Record<TaskUrgency, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  someday: "Someday",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do",
  doing: "Doing",
  done: "Done",
};

// Badge variants from the shared primitive — status accents only, theme-aware.
export const URGENCY_VARIANT: Record<TaskUrgency, "destructive" | "warning" | "secondary" | "outline"> = {
  today: "destructive",
  week: "warning",
  month: "secondary",
  someday: "outline",
};
