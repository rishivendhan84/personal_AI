import "server-only";
import { getAdminClient } from "@/lib/db/server";
import { classify, embed, transcribe, aiAvailable, type Classification } from "@/lib/ai";
import { sendMessage, downloadFile } from "@/lib/telegram";
import { DEFAULT_TZ, dateKeyInTz } from "@/lib/utils";
import type { Habit } from "@/lib/db/types";

/**
 * Capture pipeline orchestration (PRD §7.8):
 *   Telegram text/voice → (STT if voice) → classify → write to correct table →
 *   embed if freeform → confirmation reply.
 *
 * This is the reusable core; the route handlers stay thin. Kept server-only —
 * it touches the service-role DB client and provider keys.
 */

export interface ProcessCaptureInput {
  chatId: string | number;
  /** Present for text captures. For voice, fileId is set and text is derived via STT. */
  text?: string;
  source: "text" | "voice";
  fileId?: string;
}

/** urgency → human label for the confirmation reply (PRD §7.8). */
const URGENCY_LABEL: Record<Classification["urgency"], string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  someday: "Someday",
};

/** type → human label for the confirmation reply. */
const TYPE_LABEL: Record<Classification["type"], string> = {
  task: "Task",
  note: "Note",
  journal: "Journal",
  habit: "Habit",
  event: "Event",
  idea: "Idea",
};

/**
 * Full pipeline for one inbound capture. Designed to run inside the async
 * worker (QStash consumer) — NOT on the webhook response path, because Vercel
 * freezes the function once a response is returned (PRD §15). Targets < 5s
 * end-to-end so the confirmation feels instant.
 */
export async function processCapture(input: ProcessCaptureInput): Promise<{ skipped?: boolean }> {
  const { chatId, source, fileId } = input;

  // Env-gated: if Supabase isn't configured we can't persist anything. Degrade
  // gracefully rather than crash the worker (PRD convention).
  const db = getAdminClient();
  if (!db) {
    console.warn("[PAIOS:capture] Supabase unconfigured; skipping capture.");
    return { skipped: true };
  }

  // --- 1. Resolve text (STT for voice) ---
  let text = input.text ?? "";
  let transcript: string | null = null;
  if (source === "voice") {
    if (!fileId) {
      await sendMessage(chatId, "Sorry, I couldn't read that voice note (no audio).");
      return {};
    }
    try {
      const { buffer, mimeType } = await downloadFile(fileId);
      transcript = await transcribe(buffer, mimeType);
      text = transcript;
    } catch (e) {
      // Voice download / STT failed — apologise and bail. Never silently drop.
      console.error("[PAIOS:capture] voice STT failed", e);
      await sendMessage(chatId, "Sorry, I couldn't transcribe that voice note. Try again or send text.");
      return {};
    }
  }

  text = text.trim();
  if (!text) {
    await sendMessage(chatId, "Nothing to capture — send some text or a voice note.");
    return {};
  }

  // --- 2. Classify ---
  const c = await classify(text);

  // --- 3. Record the capture row (status pending_confirm) ---
  // Written before routing so the raw capture survives even if the target write
  // later throws — the capture is the source of truth, the target is derived.
  const { data: captureRow } = await db
    .from("captures")
    .insert({
      raw_text: source === "text" ? text : null,
      transcript,
      source,
      classified_type: c.type,
      classified_category: c.category,
      classified_urgency: c.urgency,
      tags: c.tags ?? [],
      confidence: c.confidence,
      status: "pending_confirm",
    })
    .select("id")
    .single();

  const captureId = captureRow?.id as string | undefined;

  // --- 4. Route to the target table by classified type ---
  const { table, rowId } = await routeToTarget(db, c, text);

  // --- 5. Backfill the capture with its target so 'fix' can trace it ---
  if (captureId && table) {
    await db
      .from("captures")
      .update({ target_table: table, target_row_id: rowId })
      .eq("id", captureId);
  }

  // --- 6. Confirmation reply (PRD §7.8) ---
  await sendMessage(chatId, formatConfirmation(c));

  return {};
}

/**
 * Insert into the correct domain table for a classification and return where it
 * landed. Centralised so the routing rules (and the calendar-read-only caveat)
 * live in one place.
 */
async function routeToTarget(
  db: NonNullable<ReturnType<typeof getAdminClient>>,
  c: Classification,
  text: string
): Promise<{ table: string | null; rowId: string | null }> {
  switch (c.type) {
    case "task": {
      const { data } = await db
        .from("tasks")
        .insert({
          title: c.title || text.slice(0, 120),
          description: text,
          category: c.category,
          urgency: c.urgency,
          effort_score: c.effort_score,
          source: "telegram",
          status: "todo",
        })
        .select("id")
        .single();
      return { table: "tasks", rowId: (data?.id as string) ?? null };
    }

    case "journal":
    case "note":
    case "idea": {
      // Freeform → memory_chunks. 'idea' has no own source_type, file as note.
      const source_type = c.type === "journal" ? "journal" : "note";
      return await writeMemoryChunk(db, source_type, text);
    }

    case "habit": {
      // Fuzzy-match an existing habit by name; if found, log today's completion.
      const habit = await findHabit(db, c.title || text);
      if (habit) {
        const tz = DEFAULT_TZ; // single-user; user-TZ lookup deferred to the brief layer
        const { data } = await db
          .from("habit_logs")
          .upsert(
            { habit_id: habit.id, log_date: dateKeyInTz(new Date(), tz) },
            { onConflict: "habit_id,log_date" } // one completion per habit per day
          )
          .select("id")
          .single();
        return { table: "habit_logs", rowId: (data?.id as string) ?? null };
      }
      // No matching habit → don't drop it; keep it as a recallable note.
      return await writeMemoryChunk(db, "note", text);
    }

    case "event": {
      // Calendar is read-only (synced from Google, PRD §7). Park as a note so
      // the intent isn't lost; promotion to a real event is out of scope here.
      return await writeMemoryChunk(db, "note", text);
    }

    default:
      return { table: null, rowId: null };
  }
}

/**
 * Write a freeform chunk to memory_chunks with selective embedding (PRD §7.7/§5):
 * only freeform text gets a vector, and only when an embedder is configured.
 * Embedding is best-effort — if it fails we still store the chunk (queue/retry
 * semantics; a backfill can embed it later). We NEVER drop the capture.
 */
async function writeMemoryChunk(
  db: NonNullable<ReturnType<typeof getAdminClient>>,
  source_type: "journal" | "note",
  content: string
): Promise<{ table: string; rowId: string | null }> {
  let embedding: number[] | null = null;
  if (aiAvailable.embed()) {
    try {
      embedding = await embed(content);
    } catch (e) {
      // Store without embedding rather than losing the chunk.
      console.warn("[PAIOS:capture] embed failed; storing chunk unembedded", e);
      embedding = null;
    }
  }
  const { data } = await db
    .from("memory_chunks")
    .insert({ source_type, content, embedding })
    .select("id")
    .single();
  return { table: "memory_chunks", rowId: (data?.id as string) ?? null };
}

/** Fuzzy habit lookup by name (case-insensitive contains, either direction). */
async function findHabit(
  db: NonNullable<ReturnType<typeof getAdminClient>>,
  query: string
): Promise<Habit | null> {
  const { data } = await db.from("habits").select("*").eq("active", true);
  const habits = (data ?? []) as Habit[];
  if (habits.length === 0) return null;
  const q = query.toLowerCase();
  return (
    habits.find((h) => {
      const n = h.name.toLowerCase();
      return q.includes(n) || n.includes(q);
    }) ?? null
  );
}

/**
 * Build the confirmation line, e.g.:
 *   Logged as *Task* · _This Week_ · #interview — reply 'fix' to change
 */
export function formatConfirmation(c: Classification): string {
  const type = TYPE_LABEL[c.type] ?? c.type;
  const urgency = URGENCY_LABEL[c.urgency] ?? c.urgency;
  const hashtags = (c.tags ?? []).map((t) => `#${t.replace(/^#/, "")}`).join(" ");
  const tagPart = hashtags ? ` · ${hashtags}` : "";
  return `Logged as *${type}* · _${urgency}_${tagPart} — reply 'fix' to change`;
}

/**
 * Single-message correction flow (PRD §7.8). Single-user, so we keep it
 * pragmatic: find the most recent pending capture, mark it corrected, and tell
 * the user what it was filed as plus how to redo it. No multi-turn state.
 */
export async function handleCorrection(chatId: string | number): Promise<{ skipped?: boolean }> {
  const db = getAdminClient();
  if (!db) return { skipped: true };

  const { data } = await db
    .from("captures")
    .select("*")
    .eq("status", "pending_confirm")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    await sendMessage(chatId, "Nothing recent to fix — send a new capture and I'll file it.");
    return {};
  }

  await db.from("captures").update({ status: "corrected" }).eq("id", data.id);

  const filedAs = data.classified_type ?? "something";
  await sendMessage(
    chatId,
    `Got it — that was filed as *${filedAs}*. Send the corrected version, ` +
      `or just say what it should be (e.g. "task today" or "journal"), and I'll re-file it.`
  );
  return {};
}
