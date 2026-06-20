import { getAdminClient } from "@/lib/db/server";
import { DEFAULT_TZ, dateKeyInTz } from "@/lib/utils";
import { sumMacros, roundTotals } from "@/lib/nutrition";
import { PageHeader, SetupHint } from "@/components/ui/page";
import { NutritionDashboard } from "@/components/nutrition/NutritionDashboard";
import type { NutritionLog, NutritionTargets, MacroTotals } from "@/lib/db/types";
import type { NutritionView } from "@/app/api/nutrition/route";

// Today's intake must never be cached.
export const dynamic = "force-dynamic";

const ZERO_TOTALS: MacroTotals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
const DEFAULT_TARGETS: NutritionTargets = {
  id: "default",
  calories: 2200,
  protein_g: 160,
  carbs_g: 220,
  fat_g: 70,
};

/**
 * Nutrition page (design v2). Server component seeds today's logs + the
 * deterministic totals (AI never sums — PRD §6) so the rings paint instantly;
 * the client dashboard then handles meal entry + refetch. Degrades to a
 * SetupHint with zeros if Supabase is unconfigured OR migration 0004 is unapplied.
 */
export default async function NutritionPage() {
  const todayKey = dateKeyInTz(new Date(), DEFAULT_TZ);
  const db = getAdminClient();

  let missingSetup = !db;
  let initial: NutritionView = {
    logs: [],
    totals: { ...ZERO_TOTALS },
    targets: { ...DEFAULT_TARGETS },
    todayKey,
  };

  if (db) {
    try {
      const [logsRes, targetsRes] = await Promise.all([
        db
          .from("nutrition_logs")
          .select("*")
          .eq("log_date", todayKey)
          .order("created_at", { ascending: true }),
        db.from("nutrition_targets").select("*").limit(1).maybeSingle(),
      ]);
      if (logsRes.error) throw logsRes.error;

      const logs = (logsRes.data ?? []) as NutritionLog[];
      initial = {
        logs,
        totals: roundTotals(sumMacros(logs)),
        targets: (targetsRes.data as NutritionTargets | null) ?? { ...DEFAULT_TARGETS },
        todayKey,
      };
    } catch {
      // Table not applied yet → render gracefully with the setup hint + zeros.
      missingSetup = true;
    }
  }

  return (
    <>
      <PageHeader
        title="Nutrition"
        description="Log meals in plain words — macros are estimated, totals are summed in code."
      />
      {missingSetup && (
        <div className="mb-5">
          <SetupHint
            what="Nutrition"
            vars={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Run migration{" "}
            <code className="rounded bg-background px-1 py-0.5">
              0004_nutrition.sql
            </code>{" "}
            to enable logging.
          </p>
        </div>
      )}
      <NutritionDashboard initial={initial} />
    </>
  );
}
