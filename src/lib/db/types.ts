// TypeScript mirror of supabase/migrations/0001_init.sql. Hand-maintained;
// keep in sync with the SQL when the schema changes.

export type TaskCategory = "Work" | "Learning" | "Personal" | "Business" | "Fitness";
export type TaskUrgency = "today" | "week" | "month" | "someday";
export type TaskStatus = "todo" | "doing" | "done";
export type CaptureSource = "text" | "voice";
export type CaptureStatus = "pending_confirm" | "confirmed" | "corrected";
export type GoalType = "weekly" | "monthly";
export type NudgeType = "brief" | "midday" | "slip" | "evening" | "context";
export type MemorySourceType = "journal" | "voice" | "note";

export interface User {
  id: string;
  name: string;
  timezone: string;
  telegram_id: string | null;
  current_focus: string | null;
  current_location: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  period_start: string;
  status: "active" | "done" | "archived";
  created_at: string;
}

export interface GoalProject {
  id: string;
  goal_id: string;
  title: string;
  status: "active" | "done" | "archived";
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  urgency: TaskUrgency;
  status: TaskStatus;
  due_date: string | null;
  effort_score: number | null;
  goal_id: string | null;
  project_id: string | null;
  ai_priority_score: number | null;
  source: "manual" | "telegram";
  sort_order: number;
  created_at: string;
  completed_at: string | null;
}

export interface Habit {
  id: string;
  name: string;
  target: string | null;
  active: boolean;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string;
  completed_at: string;
}

export interface Capture {
  id: string;
  raw_text: string | null;
  transcript: string | null;
  source: CaptureSource;
  classified_type: string | null;
  classified_category: string | null;
  classified_urgency: string | null;
  tags: string[];
  target_table: string | null;
  target_row_id: string | null;
  confidence: number | null;
  status: CaptureStatus;
  created_at: string;
}

export interface MemoryChunk {
  id: string;
  source_type: MemorySourceType;
  source_id: string | null;
  content: string;
  embedding: number[] | null;
  created_at: string;
}

export interface DailyBriefContent {
  focus: string;
  top3: { id: string; title: string; reason: string }[];
  calendar: { title: string; start_at: string }[];
  overdue: { id: string; title: string }[];
  habits: { name: string; done: boolean }[];
  goal_progress: { title: string; pct: number }[];
}

export interface DailyBrief {
  id: string;
  brief_date: string;
  content: DailyBriefContent;
  generated_at: string;
}

export interface DailyReview {
  id: string;
  review_date: string;
  top3_task_ids: string[];
  top3_completed: boolean[];
  notes: string | null;
  created_at: string;
}

export interface Nudge {
  id: string;
  type: NudgeType;
  scheduled_for: string | null;
  sent_at: string | null;
  content: string | null;
  acted_on: boolean;
  created_at: string;
}

export interface FinanceSnapshot {
  id: string;
  snapshot_date: string;
  net_worth: number;
  categories: Record<string, number>;
  monthly_spend: number | null;
  savings_rate: number | null;
  computed_at: string;
}

export interface CalendarEvent {
  id: string;
  external_id: string | null;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  synced_at: string;
}
