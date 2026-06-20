import { route, ok, fail } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { answer } from "@/lib/brain";

export const runtime = "nodejs";

/**
 * Brain query endpoint (PRD §8.3): natural-language question → routed hybrid
 * retrieval → AI answer with inline citations. Heavy lifting lives in
 * src/lib/brain.ts; this is just the HTTP boundary.
 */
export const POST = route(async (req: Request) => {
  // Degrade quietly when Supabase isn't configured (matches page SetupHint).
  if (!getAdminClient()) return ok({ skipped: true });

  const body = (await req.json().catch(() => null)) as { q?: string } | null;
  const q = body?.q?.trim();
  if (!q) return fail("Missing query", 400);

  const result = await answer(q);
  return ok(result);
});
