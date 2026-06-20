import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page";
import type { FinanceSnapshot } from "@/lib/db/types";

/**
 * Net-worth / savings trend over historical snapshots (PRD §7.6). A dependency-free
 * inline SVG sparkline — plots net_worth across snapshot_date. Every point is a
 * cached, deterministically-computed figure; this component does no money math.
 */
export function SpendTrend({ history }: { history: FinanceSnapshot[] }) {
  const points = history
    .map((s) => ({ date: s.snapshot_date, value: Number(s.net_worth) }))
    .filter((p) => Number.isFinite(p.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Net worth trend</CardTitle>
      </CardHeader>
      <CardContent>
        {points.length < 2 ? (
          <EmptyState
            title="Not enough history yet"
            hint="The trend appears once you have a couple of daily snapshots."
          />
        ) : (
          <Sparkline points={points.map((p) => p.value)} />
        )}
      </CardContent>
    </Card>
  );
}

/** Minimal responsive sparkline (viewBox-scaled so it fills its container). */
function Sparkline({ points }: { points: number[] }) {
  const W = 100;
  const H = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1; // avoid divide-by-zero on a flat line

  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((v - min) / span) * H; // invert: higher value → higher on chart
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const rising = points[points.length - 1] >= points[0];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-20 w-full"
      role="img"
      aria-label="Net worth trend sparkline"
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className={rising ? "stroke-emerald-600" : "stroke-destructive"}
      />
    </svg>
  );
}
