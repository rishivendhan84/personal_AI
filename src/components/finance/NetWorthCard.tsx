import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Format a number as USD with no cents (net-worth scale). */
function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Format a 0..1 fraction as a percent, or "—" when unknown. */
function pct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

/**
 * Hero finance metrics (PRD §7.6). Every number here comes straight from the
 * cached finance_snapshots row — already computed deterministically in finance.ts.
 * The component never does money math beyond display formatting and a delta.
 */
export function NetWorthCard({
  netWorth,
  prevNetWorth,
  monthlySpend,
  savingsRate,
}: {
  netWorth: number;
  prevNetWorth: number | null;
  monthlySpend: number | null;
  savingsRate: number | null;
}) {
  const delta =
    prevNetWorth !== null ? netWorth - prevNetWorth : null;
  const Trend = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="sm:col-span-1">
        <CardContent className="pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Net worth
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{usd(netWorth)}</p>
          {delta !== null && (
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-xs tabular-nums",
                delta > 0
                  ? "text-emerald-600"
                  : delta < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              )}
            >
              <Trend className="h-3.5 w-3.5" />
              {delta >= 0 ? "+" : "−"}
              {usd(Math.abs(delta))} since last snapshot
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Spend this month
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {monthlySpend !== null ? usd(monthlySpend) : "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Savings rate
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{pct(savingsRate)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
