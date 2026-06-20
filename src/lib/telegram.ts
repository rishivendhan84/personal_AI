import "server-only";
import { env } from "@/lib/env";

/**
 * Telegram Bot API helpers (PRD §7.8). Capture and the Direction Engine both
 * send through here. All output (briefs, nudges, confirmations) goes back to
 * the same chat — closing the capture↔direct loop.
 */

const API = "https://api.telegram.org";

function token(): string | undefined {
  return env("TELEGRAM_BOT_TOKEN");
}

/** Validate the secret-token header Telegram echoes on every webhook (§7.8). */
export function isValidWebhookSecret(header: string | null): boolean {
  const expected = env("TELEGRAM_WEBHOOK_SECRET");
  if (!expected) return true; // not configured → don't block local/dev
  return header === expected;
}

export async function sendMessage(chatId: string | number, text: string): Promise<void> {
  const t = token();
  if (!t) {
    console.warn("[PAIOS:telegram] TELEGRAM_BOT_TOKEN unset; would send:", text);
    return;
  }
  await fetch(`${API}/bot${t}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  }).catch((e) => console.error("[PAIOS:telegram] sendMessage failed", e));
}

/** Resolve a Telegram file_id to a downloadable URL, then fetch the bytes. */
export async function downloadFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const t = token();
  if (!t) throw new Error("[PAIOS:telegram] TELEGRAM_BOT_TOKEN unset.");
  const meta = await fetch(`${API}/bot${t}/getFile?file_id=${fileId}`).then((r) => r.json());
  const path = meta?.result?.file_path as string | undefined;
  if (!path) throw new Error("[PAIOS:telegram] could not resolve file path.");
  const res = await fetch(`${API}/file/bot${t}/${path}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") ?? "audio/ogg";
  return { buffer, mimeType };
}
