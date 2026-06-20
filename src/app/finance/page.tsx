import { getAdminClient } from "@/lib/db/server";
import { configured } from "@/lib/env";
import { PageHeader, SetupHint, EmptyState } from "@/components/ui/page";
import { NetWorthCard } from "@/components/finance/NetWorthCard";
import { CategoryBreakdown } from "@/components/finance/CategoryBreakdown";
import { SpendTrend } from "@/components/finance/SpendTrend";
import { RefreshButton } from "@/components/finance/RefreshButton";
import type { FinanceSnapshot } from "@/lib/db/types";

// Reads the cached snapshot on each load — no AI, no Google call here (PRD §5).
export const dynamic = "force-dynamic";

const TREND_LIMIT = 30;

/**
 * Finance Pulse page (PRD §7.6). Reads the latest finance_snapshots row (already
 * computed deterministically by /api/finance/refresh). NO AI on load. The Refresh
 * button (and a daily cron) recompute the snapshot out-of-band.
 */
export default async function FinancePage() {
  const db = getAdminClient();

  if (!db) {
    return (
      <>
        <PageHeader title="Finance Pulse" description="Net worth, spend, and savings at a glance." />
        <SetupHint
          what="Finance"
          vars={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]}
        />
      </>
    );
  }

  const { data } = await db
    .from("finance_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: false })
    .limit(TREND_LIMIT);

  const rows = (data ?? []) as FinanceSnapshot[];
  const latest = rows[0] ?? null;
  const prev = rows[1] ?? null;
  const history = [...rows].reverse(); // oldest → newest for the trend.

  return (
    <>
      <PageHeader
        title="Finance Pulse"
        description="Numbers are deterministic sums; AI only labels categories."
        action={<RefreshButton />}
      />

      {!configured.googleSheets() && (
        <div className="mb-4">
          <SetupHint
            what="Google Sheets sync"
            vars={["GOOGLE_SHEETS_SPREADSHEET_ID", "GOOGLE_SHEETS_RANGE", "GOOGLE_REFRESH_TOKEN"]}
          />
        </div>
      )}

      {!latest ? (
        <EmptyState
          title="No snapshot yet"
          hint="Click Refresh to pull your finance sheet and compute the first snapshot."
        />
      ) : (
        <div className="space-y-4">
          <NetWorthCard
            netWorth={Number(latest.net_worth)}
            prevNetWorth={prev ? Number(prev.net_worth) : null}
            monthlySpend={latest.monthly_spend !== null ? Number(latest.monthly_spend) : null}
            savingsRate={latest.savings_rate}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CategoryBreakdown categories={latest.categories ?? {}} />
            <SpendTrend history={history} />
          </div>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            Last computed {new Date(latest.computed_at).toLocaleString()}
          </p>
        </div>
      )}
    </>
  );
}
