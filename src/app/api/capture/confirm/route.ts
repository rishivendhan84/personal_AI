import { ok, fail, route } from "@/lib/http";
import { handleCorrection } from "@/lib/capture";

export const runtime = "nodejs";

/**
 * Correction consumer (PRD §7.8). Triggered when the user replies "fix" to a
 * confirmation. Marks the most recent pending capture as corrected and prompts
 * for a re-file. Single-user, single-message flow — deliberately stateless.
 *
 * Like /process, accepts QStash JSON or a direct internal call.
 * TODO: verify QStash signatures via QSTASH_CURRENT_SIGNING_KEY in production.
 */
export const POST = route(async (req: Request) => {
  const body = (await req.json().catch(() => null)) as { chatId?: string | number } | null;
  if (!body?.chatId) return fail("bad request", 400);

  const result = await handleCorrection(body.chatId);
  return ok(result);
});
