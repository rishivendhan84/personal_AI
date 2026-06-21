import { ok, fail, route } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { DEFAULT_TZ, dateKeyInTz } from "@/lib/utils";
import type { FocusSession } from "@/lib/db/types";
import { MODES, type FocusMode } from "@/lib/focus";

export const runtime = "nodejs";

export interface FocusView {
  todaySessions: number;
  todayMinutes: number;
  recent: FocusSession[];
}

/** GET /api/focus — today's completed focus sessions + minutes, and recent history. */
export const GET = route(async () => {
  const db = getAdminClient();
  const empty: FocusView = { todaySessions: 0, todayMinutes: 0, recent: [] };
  if (!db) return ok(empty);
  try {
    const todayKey = dateKeyInTz(new Date(), DEFAULT_TZ);
    const { data, error } = await db
      .from("focus_sessions")
      .select("*")
      .order("completed_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const rows = (data ?? []) as FocusSession[];
    const today = rows.filter((r) => dateKeyInTz(new Date(r.completed_at), DEFAULT_TZ) === todayKey);
    return ok<FocusView>({
      todaySessions: today.length,
      todayMinutes: today.reduce((s, r) => s + (r.minutes ?? 0), 0),
      recent: rows.slice(0, 8),
    });
  } catch (e) {
    console.warn("[PAIOS:focus] GET degraded (table missing?):", e);
    return ok(empty);
  }
});

/** POST /api/focus — log a completed focus session. */
export const POST = route(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as {
    mode?: string;
    minutes?: number;
    task_id?: string | null;
    task_title?: string | null;
  };
  const mode = body.mode as FocusMode;
  if (!mode || !(mode in MODES)) return fail("invalid mode", 400);
  const minutes = Number.isFinite(body.minutes) ? Math.max(0, Math.round(body.minutes!)) : MODES[mode].focusMin;

  const db = getAdminClient();
  if (!db) return ok({ skipped: true });
  try {
    const { data, error } = await db
      .from("focus_sessions")
      .insert({
        mode,
        minutes,
        task_id: body.task_id ?? null,
        task_title: body.task_title ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return ok({ session: data as FocusSession });
  } catch (e) {
    console.warn("[PAIOS:focus] insert degraded (table missing?):", e);
    return ok({ skipped: true });
  }
});
