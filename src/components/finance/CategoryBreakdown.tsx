"use client";
import { PieChart } from "lucide-react";
import { BentoCard, BentoHeader } from "@/components/ui/bento-card";
import { EmptyState } from "@/components/ui/page";

/** Format a number as USD with no cents (category scale). */
function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Cyan-tinted ramp for donut segments — strongest = largest category. */
const RAMP = [
  "#22D3EE", // cyan (token)
  "#38DBEF",
  "#5BE3F2",
  "#7DEAF5",
  "#A0F1F8",
  "#C2F8FB",
];

/**
 * Spend-by-category breakdown (PRD §7.6) from the snapshot's `categories` jsonb.
 * The amounts were summed deterministically in finance.ts; here we only sort,
 * total, and draw a proportional donut. AI may have *named* a category, never sized it.
 * Lightweight inline SVG — no chart library.
 */
export function CategoryBreakdown({
  categories,
}: {
  categories: Record<string, number>;
}) {
  const entries = Object.entries(categories)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <BentoCard animate={false} className="h-full">
      <BentoHeader icon={PieChart} title="Spending by category" />
      {entries.length === 0 || total <= 0 ? (
        <EmptyState
          title="No categorized spend yet"
          hint="Refresh to pull and categorize transactions."
        />
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <Donut entries={entries} total={total} />
          <ul className="w-full flex-1 space-y-2">
            {entries.map(([name, amount], i) => {
              const share = amount / total;
              return (
                <li
                  key={name}
                  className="flex items-baseline justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: RAMP[i % RAMP.length] }}
                      aria-hidden
                    />
                    <span className="truncate text-foreground">{name}</span>
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                    {usd(amount)}{" "}
                    <span className="text-xs text-foreground/70">
                      {Math.round(share * 100)}%
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </BentoCard>
  );
}

/** Minimal donut built from stacked SVG circle stroke-dash arcs (no chart lib). */
function Donut({
  entries,
  total,
}: {
  entries: [string, number][];
  total: number;
}) {
  const size = 120;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;
  const arcs = entries.map(([name, amount], i) => {
    const frac = amount / total;
    const dash = frac * c;
    const arc = (
      <circle
        key={name}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={RAMP[i % RAMP.length]}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c - dash}`}
        strokeDashoffset={-offset}
      />
    );
    offset += dash;
    return arc;
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      role="img"
      aria-label="Spending split by category"
    >
      {/* track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={stroke}
        opacity={0.4}
      />
      {/* rotate so the first segment starts at 12 o'clock */}
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>{arcs}</g>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground font-mono text-[13px] font-semibold tabular-nums"
      >
        {usd(total)}
      </text>
    </svg>
  );
}
