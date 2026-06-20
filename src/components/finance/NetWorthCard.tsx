"use client";
import { Wallet, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BentoCard, BentoHeader } from "@/components/ui/bento-card";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/utils";

/**
 * Hero finance metrics (PRD §7.6). Every number here comes straight from the
 * cached finance_snapshots row — already computed deterministically in finance.ts.
 * The component never does money math beyond display formatting and a delta.
 *
 * Motion rule: net worth counts up on change/refresh only (animateOnMount=false),
 * never on first load. All figures are font-mono / tabular-nums.
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
  const delta = prevNetWorth !== null ? netWorth - prevNetWorth : null;
  const Trend =
    delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Net worth — hero figure, large mono count-up, cyan + violet glow */}
      <BentoCard span="lg:col-span-1" glow animate={false}>
        <BentoHeader icon={Wallet} title="Net worth" />
        <p className="text-4xl font-semibold leading-none text-cyan sm:text-5xl">
          <CountUp
            value={netWorth}
            prefix="$"
            animateOnMount={false}
            className="font-mono tabular-nums"
          />
        </p>
        {delta !== null && (
          <p
            className={cn(
              "mt-3 flex items-center gap-1.5 font-mono text-xs tabular-nums",
              delta > 0
                ? "text-positive"
                : delta < 0
                  ? "text-danger"
                  : "text-muted-foreground"
            )}
          >
            <Trend className="h-3.5 w-3.5" aria-hidden />
            {delta >= 0 ? "+" : "−"}$
            {Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span className="text-muted-foreground">since last snapshot</span>
          </p>
        )}
      </BentoCard>

      <BentoCard animate={false}>
        <BentoHeader title="Spend this month" />
        <p className="text-3xl font-semibold leading-none">
          {monthlySpend !== null ? (
            <CountUp
              value={monthlySpend}
              prefix="$"
              animateOnMount={false}
              className="font-mono tabular-nums"
            />
          ) : (
            <span className="font-mono tabular-nums text-muted-foreground">—</span>
          )}
        </p>
      </BentoCard>

      <BentoCard animate={false}>
        <BentoHeader title="Savings rate" />
        <p className="text-3xl font-semibold leading-none">
          {savingsRate !== null && Number.isFinite(savingsRate) ? (
            <CountUp
              value={savingsRate * 100}
              suffix="%"
              animateOnMount={false}
              className="font-mono tabular-nums text-cyan"
            />
          ) : (
            <span className="font-mono tabular-nums text-muted-foreground">—</span>
          )}
        </p>
      </BentoCard>
    </div>
  );
}
