import { ok, fail, route } from "@/lib/http";
import { processCapture, type ProcessCaptureInput } from "@/lib/capture";

// Voice STT works on a Buffer; Node runtime required (PRD convention).
export const runtime = "nodejs";

/**
 * Async capture worker (QStash consumer, PRD §15). Runs the full pipeline off
 * the webhook's response path so Telegram got its instant 200.
 *
 * Accepts both QStash-delivered JSON and a direct internal call (the queue
 * fallback fetch sets `x-paios-internal` when QStash isn't configured).
 *
 * TODO: verify QStash signatures with QSTASH_CURRENT_SIGNING_KEY before trusting
 * the body in production. Skipped here so the internal-fetch fallback still works
 * at single-user scale.
 */
export const POST = route(async (req: Request) => {
  const body = (await req.json().catch(() => null)) as ProcessCaptureInput | null;
  if (!body?.chatId || !body?.source) return fail("bad request", 400);

  const result = await processCapture({
    chatId: body.chatId,
    text: body.text,
    source: body.source,
    fileId: body.fileId,
  });

  return ok(result);
});
