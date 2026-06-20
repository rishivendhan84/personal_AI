import type { Classification } from "@/lib/ai/types";

const CATEGORIES = ["Work", "Learning", "Personal", "Business", "Fitness"] as const;
const URGENCIES = ["today", "week", "month", "someday"] as const;
const TYPES = ["task", "note", "journal", "habit", "event", "idea"] as const;

function pick<T extends readonly string[]>(
  arr: T,
  v: unknown,
  fallback: T[number]
): T[number] {
  return (arr as readonly string[]).includes(String(v)) ? (v as T[number]) : fallback;
}

function clamp(n: unknown, lo: number, hi: number, dflt: number): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return dflt;
  return Math.min(hi, Math.max(lo, x));
}

/**
 * Defensively parse an LLM JSON classification. Models occasionally wrap JSON in
 * prose or omit fields; we coerce to a valid Classification and never throw, so
 * a flaky model degrades to sane defaults rather than dropping a capture.
 */
export function parseClassification(raw: string, sourceText: string): Classification {
  let obj: Record<string, unknown> = {};
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    obj = match ? JSON.parse(match[0]) : {};
  } catch {
    obj = {};
  }
  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim().slice(0, 120)
      : sourceText.trim().slice(0, 80) || "Untitled capture";
  return {
    type: pick(TYPES, obj.type, "note"),
    category: pick(CATEGORIES, obj.category, "Personal"),
    urgency: pick(URGENCIES, obj.urgency, "week"),
    title,
    tags: Array.isArray(obj.tags)
      ? obj.tags.map((t) => String(t).toLowerCase()).slice(0, 4)
      : [],
    effort_score: Math.round(clamp(obj.effort_score, 1, 5, 2)),
    confidence: clamp(obj.confidence, 0, 1, 0.5),
  };
}
