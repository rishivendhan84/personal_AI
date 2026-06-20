import "server-only";
import { getAdminClient } from "@/lib/db/server";
import { sendMessage } from "@/lib/telegram";
import { dateKeyInTz, DEFAULT_TZ, USER_ID } from "@/lib/utils";
import type { DailyBrief, DailyBriefContent, NudgeType, User } from "@/lib/db/types";

/**
 * Direction Engine shared helpers (PRD §7.0). The engine *pushes* — briefs,
 * nudges, slip-detection, evening review. Every trigger here obeys two rules:
 *
 *   1. SINGLE-NEXT-ACTION framing, never a data dump. We surface the one thing
 *      worth doing next, not a list to scroll past.
 *   2. Every push records a `nudges` row (type, content, sent_at) so the system
 *      knows what it has already said and the §8.2 feedback loop has history.
 *
 * Route handlers stay thin; the load-the-user / format / record-nudge / send
 * plumbing lives here.
 */

/** Load the single user (PRD §4 — no auth, no multi-tenancy). */
export async function getUser(): Promise<User | null> {
  const db = getAdminClient();
  if (!db) return null;
  const { data } = await db.from("users").select("*").eq("id", USER_ID).single<User>();
  return data ?? null;
}

/** User timezone with a safe fallback (used for today's date keys). */
export function userTz(user: User | null): string {
  return user?.timezone ?? DEFAULT_TZ;
}

/**
 * Resolve the Telegram chat id from the users row. Null when unset — callers
 * should log + skip sending (integrations are env-gated and degrade gracefully).
 */
export async function getUserChatId(): Promise<string | null> {
  const user = await getUser();
  return user?.telegram_id ?? null;
}

/** Today's YYYY-MM-DD in the user's timezone. */
export async function todayKey(now = new Date()): Promise<string> {
  const user = await getUser();
  return dateKeyInTz(now, userTz(user));
}

/** Read today's cached brief content (no AI), or null if none stored yet. */
export async function getTodayBrief(now = new Date()): Promise<DailyBriefContent | null> {
  const db = getAdminClient();
  if (!db) return null;
  const key = await todayKey(now);
  const { data } = await db
    .from("daily_briefs")
    .select("*")
    .eq("brief_date", key)
    .maybeSingle<DailyBrief>();
  return data?.content ?? null;
}

/** Record a nudge row. Single source of truth for "we pushed this" (§7.0). */
export async function recordNudge(type: NudgeType, content: string): Promise<void> {
  const db = getAdminClient();
  if (!db) return;
  const nowIso = new Date().toISOString();
  await db.from("nudges").insert({
    type,
    content,
    scheduled_for: nowIso,
    sent_at: nowIso,
  });
}

/**
 * Push one nudge: send to Telegram (if chat id known) + record the nudges row.
 * Always records even when Telegram is unconfigured, so history is complete and
 * the route never crashes (graceful degradation, §12).
 */
export async function pushNudge(type: NudgeType, content: string): Promise<{ sent: boolean }> {
  const chatId = await getUserChatId();
  let sent = false;
  if (chatId) {
    await sendMessage(chatId, content);
    sent = true;
  } else {
    console.warn(`[PAIOS:direction] no telegram_id; skip send for nudge type=${type}`);
  }
  await recordNudge(type, content);
  return { sent };
}

/** HH:MM in the user's tz, for terse event headlines. */
export function timeInTz(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Keyword overlap between two titles. Deliberately simple (PRD §7.0 context
 * surfacing matches "by simple keyword overlap") — no embeddings on the hot path.
 */
export function keywordOverlap(a: string, b: string): boolean {
  const stop = new Set([
    "the", "a", "an", "to", "of", "and", "or", "for", "with", "on", "in", "at",
    "is", "my", "me", "do", "it", "by",
  ]);
  const tokens = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stop.has(w))
    );
  const ta = tokens(a);
  const tb = tokens(b);
  for (const w of ta) if (tb.has(w)) return true;
  return false;
}
