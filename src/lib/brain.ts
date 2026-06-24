import "server-only";
import { getAdminClient } from "@/lib/db/server";
import { reason, embed, aiAvailable } from "@/lib/ai";
import type { Task, Goal } from "@/lib/db/types";

/**
 * The Brain (PRD §7.7 / §8.3). HYBRID retrieval, not pure semantic:
 * a router decides per query whether to hit SQL (structured rows), the vector
 * index (freeform memory), or both. Structured rows are NEVER embedded — they're
 * queried directly — so "tasks due this week" stays exact while "what did I
 * journal about X" goes fuzzy.
 */

export type BrainRoute = "structured" | "vector" | "mixed";

/** A citation. Maps 1:1 to the [n] markers the model emits. */
export interface Source {
  type: "task" | "goal" | "journal" | "voice" | "note";
  id: string;
  title?: string;
  snippet: string;
}

export interface BrainResult {
  answer: string | null; // null when LLM unavailable OR no sources matched
  sources: Source[];
  route: BrainRoute;
  llm: boolean; // whether an LLM is actually configured (so the UI can be honest)
}

// --- Routing heuristics ---------------------------------------------------
// Cheap keyword signals first; an optional LLM refine only nudges ambiguous
// cases. The heuristic alone must be correct enough to ship without an LLM.

const STRUCTURED_HINTS = [
  "task", "tasks", "todo", "to-do", "open", "due", "overdue", "this week",
  "today", "goal", "goals", "habit", "habits", "status", "doing", "complete",
  "completed", "finished", "deadline", "urgent",
];

const VECTOR_HINTS = [
  "idea", "ideas", "mentioned", "remember", "recall", "journal", "journaled",
  "felt", "feeling", "thought", "note", "noted", "last month", "last week",
  "wrote", "said", "talked about", "voice", "memo",
];

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

/**
 * Pure, synchronous router. Both signals (or neither) → mixed: cheaper to over-
 * fetch a few rows than to silently miss the answer the user wanted.
 */
export function routeQuery(q: string): BrainRoute {
  const s = q.toLowerCase();
  const structured = hasAny(s, STRUCTURED_HINTS);
  const vector = hasAny(s, VECTOR_HINTS);
  if (structured && !vector) return "structured";
  if (vector && !structured) return "vector";
  return "mixed"; // both signals present, or query too vague to commit
}

// --- Structured search (SQL, exact) --------------------------------------

/** Map loose query language to a status filter. Returns undefined = no filter. */
function statusFilter(s: string): Task["status"] | undefined {
  if (/\b(open|todo|to-do|outstanding|remaining|still|pending)\b/.test(s)) return "todo";
  if (/\b(doing|in progress|started|working on)\b/.test(s)) return "doing";
  if (/\b(done|completed|finished|complete)\b/.test(s)) return "done";
  return undefined;
}

/** Map loose query language to a task urgency bucket. */
function urgencyFilter(s: string): Task["urgency"] | undefined {
  if (/\b(today)\b/.test(s)) return "today";
  if (/\b(this week|week|due soon)\b/.test(s)) return "week";
  if (/\b(this month|month)\b/.test(s)) return "month";
  if (/\b(someday|eventually|later)\b/.test(s)) return "someday";
  return undefined;
}

/**
 * Strip routing/filter keywords so the ilike term is the actual subject
 * ("interview prep tasks still open" → "interview prep"). Best-effort: if we
 * strip everything, fall back to the raw query.
 */
function subjectTerm(q: string): string {
  const stripped = q
    .toLowerCase()
    .replace(
      /\b(task|tasks|todo|to-do|open|due|overdue|this week|this month|today|goal|goals|habit|habits|status|doing|done|complete|completed|finished|outstanding|remaining|still|pending|urgent|deadline|show me|show|list|what are|what is|whats|what's|which|my|me|the|all|any|current|get|give|find|tell)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  // Generic listing query ("list my current tasks") → no subject left → return
  // the raw query so the caller's `term !== query` guard skips the ilike filter
  // and lists everything matching the status/urgency filters instead.
  return stripped.length >= 2 ? stripped : q.trim();
}

export async function structuredSearch(q: string): Promise<Source[]> {
  const db = getAdminClient();
  if (!db) return [];

  const s = q.toLowerCase();
  const term = subjectTerm(q);
  const status = statusFilter(s);
  const urgency = urgencyFilter(s);
  const wantsGoal = /\bgoal/.test(s);
  const wantsTask = /\b(task|todo|to-do|open|due|overdue)\b/.test(s) || !wantsGoal;

  const sources: Source[] = [];

  if (wantsTask) {
    let query = db.from("tasks").select("*").limit(8);
    if (status) query = query.eq("status", status);
    if (urgency) query = query.eq("urgency", urgency);
    // Only constrain by subject when it adds signal; a generic "open tasks"
    // should list everything matching the filters.
    if (term && term !== s.trim()) {
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }
    const { data } = await query.order("created_at", { ascending: false });
    for (const t of (data ?? []) as Task[]) {
      sources.push({
        type: "task",
        id: t.id,
        title: t.title,
        snippet: [t.status, t.urgency, t.due_date ? `due ${t.due_date}` : null]
          .filter(Boolean)
          .join(" · "),
      });
    }
  }

  if (wantsGoal || !wantsTask) {
    let query = db.from("goals").select("*").limit(6);
    if (term && term !== s.trim()) query = query.ilike("title", `%${term}%`);
    const { data } = await query.order("created_at", { ascending: false });
    for (const g of (data ?? []) as Goal[]) {
      sources.push({
        type: "goal",
        id: g.id,
        title: g.title,
        snippet: `${g.type} goal · ${g.status}`,
      });
    }
  }

  return sources;
}

// --- Vector search (fuzzy, embeddings) -----------------------------------

interface MatchRow {
  id: string;
  content: string;
  source_type: Source["type"];
  similarity?: number;
}

/**
 * Fuzzy recall over freeform memory. Prefers the pgvector RPC; degrades to a
 * plain ilike scan when embeddings aren't configured OR the RPC migration hasn't
 * been applied yet (catch → fallback). Either way the Brain stays useful.
 */
export async function vectorSearch(q: string, k = 6): Promise<Source[]> {
  const db = getAdminClient();
  if (!db) return [];

  if (aiAvailable.embed()) {
    try {
      const qv = await embed(q);
      const { data, error } = await db.rpc("match_memory_chunks", {
        query_embedding: qv,
        match_count: k,
      });
      if (error) throw error; // e.g. function not found → fall through to ilike
      return (data as MatchRow[]).map((r) => ({
        type: r.source_type,
        id: r.id,
        snippet: r.content.slice(0, 280),
      }));
    } catch (e) {
      console.warn("[PAIOS:brain] vector RPC unavailable, ilike fallback:", e);
    }
  }

  // Fallback: lexical scan. Not semantic, but never empty-handed.
  const { data } = await db
    .from("memory_chunks")
    .select("id, content, source_type")
    .ilike("content", `%${subjectTerm(q)}%`)
    .limit(k);
  return ((data ?? []) as MatchRow[]).map((r) => ({
    type: r.source_type,
    id: r.id,
    snippet: r.content.slice(0, 280),
  }));
}

// --- Notes search (lexical over the Keep-style notes board) ---------------

/**
 * Lexical recall over the notes table (Keep import + native notes). Defensive:
 * the table may not exist yet (migration 0006), so any failure returns [] rather
 * than taking down the Brain.
 */
export async function notesSearch(q: string, k = 5): Promise<Source[]> {
  const db = getAdminClient();
  if (!db) return [];
  try {
    const term = subjectTerm(q);
    let query = db.from("notes").select("id, title, body, checklist").eq("archived", false).limit(k);
    if (term && term !== q.trim().toLowerCase()) {
      query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
    }
    const { data, error } = await query.order("updated_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as {
      id: string;
      title: string | null;
      body: string | null;
      checklist: { text: string }[] | null;
    }[]).map((n) => {
      const checklistText = (n.checklist ?? []).map((c) => c.text).join(", ");
      return {
        type: "note" as const,
        id: n.id,
        title: n.title ?? undefined,
        snippet: (n.body || checklistText || n.title || "").slice(0, 280),
      };
    });
  } catch {
    return [];
  }
}

// --- Compose the answer ---------------------------------------------------

const SYSTEM = `You are the user's second brain. Answer the question using ONLY the numbered sources provided. Cite every claim inline with bracketed numbers like [1], [2] that refer to the source numbers. If the sources do not contain the answer, say so plainly — never invent facts. Be concise.`;

function buildPrompt(q: string, sources: Source[]): string {
  const list = sources
    .map((src, i) => {
      const head = src.title ? `${src.title} — ` : "";
      return `[${i + 1}] (${src.type}) ${head}${src.snippet}`;
    })
    .join("\n");
  return `Question: ${q}\n\nSources:\n${list}\n\nAnswer (cite with [n]):`;
}

/**
 * Top-level entry: route → gather → reason. Runs structured+vector in parallel
 * for "mixed" to stay under the §12 latency budget. Degrades to search-only
 * (sources, no prose) when no LLM is configured.
 */
export async function answer(q: string): Promise<BrainResult> {
  const route = routeQuery(q);
  const llm = aiAvailable.llm();

  const tasks: Promise<Source[]>[] = [];
  if (route === "structured" || route === "mixed") tasks.push(structuredSearch(q));
  if (route === "vector" || route === "mixed") {
    tasks.push(vectorSearch(q));
    tasks.push(notesSearch(q)); // notes are freeform recall, like journal/memory
  }
  const sources = (await Promise.all(tasks)).flat();

  if (!llm || sources.length === 0) {
    // No model, or nothing matched — hand back the matches and let the UI show
    // the *accurate* reason (no model vs no data) using the `llm` flag.
    return { answer: null, sources, route, llm };
  }

  try {
    const text = await reason({
      system: SYSTEM,
      prompt: buildPrompt(q, sources),
      maxTokens: 700,
    });
    return { answer: text.trim(), sources, route, llm };
  } catch (e) {
    // A model/network error shouldn't 500 the Brain — fall back to sources.
    console.warn("[PAIOS:brain] reason() failed, returning sources only:", e);
    return { answer: null, sources, route, llm };
  }
}
