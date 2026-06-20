import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import type { FinanceSnapshot } from "@/lib/db/types";

export const runtime = "nodejs";

/** Number of historical snapshots returned for the savings/net-worth trend. */
const TREND_LIMIT = 30;

/**
 * GET /api/finance (PRD §7.6, §5) — read the latest finance_snapshots row + recent
 * history for the trend chart. NO AI and NO Google call on load: the page only
 * reads the cached, already-computed snapshot. Refreshing happens out-of-band via
 * /api/finance/refresh (manual button + daily cron).
 *
 * Returns {skipped} with nulls when Supabase isn't configured.
 */
export const GET = route(async () => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true, latest: null, history: [] as FinanceSnapshot[] });

  const { data, error } = await db
    .from("finance_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: false })
    .limit(TREND_LIMIT);
  if (error) throw error;

  const rows = (data ?? []) as FinanceSnapshot[];
  const latest = rows[0] ?? null;
  // History oldest→newest so trend components can plot left-to-right directly.
  const history = [...rows].reverse();

  return ok({ latest, history });
});
