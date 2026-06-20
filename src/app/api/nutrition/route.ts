import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { DEFAULT_TZ, dateKeyInTz } from "@/lib/utils";
import { sumMacros, roundTotals } from "@/lib/nutrition";
import type { NutritionLog, NutritionTargets, MacroTotals } from "@/lib/db/types";

export const runtime = "nodejs";

const ZERO_TOTALS: MacroTotals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

/** Sane defaults when the targets row (or the whole table) isn't there yet. */
const DEFAULT_TARGETS: NutritionTargets = {
  id: "default",
  calories: 2200,
  protein_g: 160,
  carbs_g: 220,
  fat_g: 70,
};

/** Shape the nutrition page consumes. */
export interface NutritionView {
  logs: NutritionLog[];
  totals: MacroTotals;
  targets: NutritionTargets;
  todayKey: string;
}

/**
 * GET /api/nutrition — today's meal logs + deterministic macro totals + targets.
 *
 * AI never sums (PRD §6): rows are estimated per-meal, but `sumMacros` adds them
 * up here in code. Degrades to empty/zero (and default targets) when Supabase is
 * unconfigured OR migration 0004 hasn't been applied — never crashes.
 */
export const GET = route(async () => {
  const todayKey = dateKeyInTz(new Date(), DEFAULT_TZ);
  const db = getAdminClient();

  const empty = (): Response =>
    ok<NutritionView>({
      logs: [],
      totals: { ...ZERO_TOTALS },
      targets: { ...DEFAULT_TARGETS },
      todayKey,
    });

  if (!db) return empty();

  try {
    const [logsRes, targetsRes] = await Promise.all([
      db
        .from("nutrition_logs")
        .select("*")
        .eq("log_date", todayKey)
        .order("created_at", { ascending: true }),
      db.from("nutrition_targets").select("*").limit(1).maybeSingle(),
    ]);

    // A missing table surfaces as an error here → degrade rather than throw.
    if (logsRes.error) throw logsRes.error;

    const logs = (logsRes.data ?? []) as NutritionLog[];
    const targets = (targetsRes.data as NutritionTargets | null) ?? {
      ...DEFAULT_TARGETS,
    };

    return ok<NutritionView>({
      logs,
      totals: roundTotals(sumMacros(logs)),
      targets,
      todayKey,
    });
  } catch (e) {
    console.warn("[PAIOS:nutrition] GET degraded (DB unavailable / table missing):", e);
    return empty();
  }
});
