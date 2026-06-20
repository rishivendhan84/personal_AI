import type { TaskCategory, TaskUrgency, TaskStatus } from "@/lib/db/types";

/** Shared option lists + display accents for the task UI. Centralised so the
 * board, card, form and filters never drift on labels/colors. */

export const CATEGORIES: TaskCategory[] = ["Work", "Learning", "Personal", "Business", "Fitness"];
export const URGENCIES: TaskUrgency[] = ["today", "week", "month", "someday"];
export const STATUSES: TaskStatus[] = ["todo", "doing", "done"];

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
