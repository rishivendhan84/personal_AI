import { ok, fail, route } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { USER_ID } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * PATCH /api/user — update the single user's editable profile fields
 * (current_focus, current_location). Server-side so it works under locked RLS.
 */
export const PATCH = route(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as {
    current_focus?: string;
    current_location?: string;
  };
  const patch: Record<string, string> = {};
  if (typeof body.current_focus === "string")
    patch.current_focus = body.current_focus.trim().slice(0, 140);
  if (typeof body.current_location === "string")
    patch.current_location = body.current_location.trim().slice(0, 120);
  if (Object.keys(patch).length === 0) return fail("nothing to update", 400);

  const db = getAdminClient();
  if (!db) return ok({ skipped: true });

  const { error } = await db.from("users").update(patch).eq("id", USER_ID);
  if (error) return fail(error.message, 500);
  return ok(patch);
});
