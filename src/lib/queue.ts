import "server-only";
import { Client } from "@upstash/qstash";
import { env } from "@/lib/env";

/**
 * Upstash QStash — powers async capture processing (return 200 to Telegram
 * immediately, do work off the response, PRD §15) and Direction Engine
 * scheduling. Returns null when not configured; callers then fall back to
 * inline processing (fine at single-user scale, just less robust).
 */
export function getQStash(): Client | null {
  const token = env("QSTASH_TOKEN");
  if (!token) return null;
  return new Client({ token });
}

/**
 * Enqueue work to one of our own API routes. Falls back to a direct fetch when
 * QStash isn't configured so the pipeline still works in local/dev.
 */
export async function enqueue(path: string, body: unknown): Promise<void> {
  const base = env("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
  const url = `${base}${path}`;
  const qstash = getQStash();
  if (qstash) {
    await qstash.publishJSON({ url, body });
    return;
  }
  // Fire-and-forget fallback. Not awaited for completion to mimic queue semantics.
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-paios-internal": "1" },
    body: JSON.stringify(body),
  }).catch(() => {});
}
