import { ok, fail, route } from "@/lib/http";
import { isValidWebhookSecret } from "@/lib/telegram";
import { enqueue } from "@/lib/queue";

// Buffer is needed downstream for voice; pin the Node runtime for the whole chain.
export const runtime = "nodejs";

/**
 * Inbound Telegram webhook (PRD §7.8).
 *
 * §15 async-safety: Vercel freezes a function the moment it returns a response,
 * so we do NO heavy work here. We validate, parse, ENQUEUE the real work, and
 * return 200 immediately. Telegram only needs a fast 200 to consider the update
 * delivered; classification/STT/DB writes happen in /api/capture/process.
 */
export const POST = route(async (req: Request) => {
  // Telegram echoes our configured secret on every webhook call.
  if (!isValidWebhookSecret(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return fail("unauthorized", 401);
  }

  const update = await req.json().catch(() => null);
  const message = update?.message;
  const chatId = message?.chat?.id;
  if (!chatId) return ok({ ignored: true }); // non-message update; ack so Telegram stops retrying

  const text: string | undefined = message?.text;
  const voiceFileId: string | undefined = message?.voice?.file_id;

  // "fix" (case-insensitive, text only) is the correction trigger — route it to
  // the confirm consumer instead of starting a new capture.
  if (text && text.trim().toLowerCase() === "fix") {
    await enqueue("/api/capture/confirm", { chatId });
    return ok({ enqueued: "confirm" });
  }

  if (voiceFileId) {
    await enqueue("/api/capture/process", { chatId, fileId: voiceFileId, source: "voice" });
    return ok({ enqueued: "process", source: "voice" });
  }

  if (text) {
    await enqueue("/api/capture/process", { chatId, text, source: "text" });
    return ok({ enqueued: "process", source: "text" });
  }

  // Unsupported message kind (photo, sticker, etc.) — ack without enqueuing.
  return ok({ ignored: true });
});
