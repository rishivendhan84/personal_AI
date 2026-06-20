import { route, ok, fail } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { DEFAULT_TZ, dateKeyInTz } from "@/lib/utils";
import { estimateMeal, sanitizeMacros } from "@/lib/nutrition";
import type { NutritionLog } from "@/lib/db/types";

export const runtime = "nodejs";

interface LogBody {
  meal?: string;
  /** Optional pre-edited macros (editable-chip path) — skips AI when present. */
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

/** True when the caller supplied any explicit macro field. */
function hasExplicitMacros(b: LogBody): boolean {
  return (
    b.calories !== undefined ||
    b.protein_g !== undefined ||
    b.carbs_g !== undefined ||
    b.fat_g !== undefined
  );
}

/**
 * POST /api/nutrition/log — add a meal.
 *
 *  - { meal } → the LLM ESTIMATES per-meal macros (allowed; summing stays in
 *    code per PRD §6), then we insert the row.
 *  - { meal, calories, protein_g, carbs_g, fat_g } → insert the supplied macros
 *    directly (editable-chip / manual-correction path, no AI call).
 *
 * Degrades to { skipped:true } when Supabase is unconfigured or the table is
 * missing — the meal estimate is still returned so the UI can show it.
 */
export const POST = route(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as LogBody;
  const meal = (body.meal ?? "").trim();
  if (!meal) return fail("meal is required", 400);

  const macros = hasExplicitMacros(body)
    ? sanitizeMacros(body)
    : await estimateMeal(meal);

  const logDate = dateKeyInTz(new Date(), DEFAULT_TZ);
  const row = {
    log_date: logDate,
    meal,
    calories: macros.calories,
    protein_g: macros.protein_g,
    carbs_g: macros.carbs_g,
    fat_g: macros.fat_g,
    source: "manual" as const,
  };

  const db = getAdminClient();
  if (!db) return ok({ skipped: true, estimate: macros });

  try {
    const { data, error } = await db
      .from("nutrition_logs")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return ok({ log: data as NutritionLog });
  } catch (e) {
    console.warn("[PAIOS:nutrition] insert degraded (table missing?):", e);
    return ok({ skipped: true, estimate: macros });
  }
});

/**
 * DELETE /api/nutrition/log?id=<uuid> — remove a meal. Server-side so it works
 * under locked-down RLS (the browser never touches the DB directly).
 */
export const DELETE = route(async (req: Request) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("id is required", 400);
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });
  try {
    const { error } = await db.from("nutrition_logs").delete().eq("id", id);
    if (error) throw error;
    return ok({ deleted: id });
  } catch (e) {
    console.warn("[PAIOS:nutrition] delete degraded:", e);
    return ok({ skipped: true });
  }
});
