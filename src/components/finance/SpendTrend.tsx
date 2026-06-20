"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { BentoCard, BentoHeader } from "@/components/ui/bento-card";
import { EmptyState } from "@/components/ui/page";
import { useReducedMotion, DUR } from "@/lib/motion";
import type { FinanceSnapshot } from "@/lib/db/types";

/**
 * Net-worth / savings trend over historical snapshots (PRD §7.6). A dependency-free
 * inline SVG sparkline — plots net_worth across snapshot_date. Every point is a
 * cached, deterministically-computed figure; this component does no money math.
 *
 * Motion rule: the line "draws" on change/refresh only (keyed by the data), never
 * a perpetual/load animation; reduced-motion shows it instantly.
 */
export function SpendTrend({ history }: { history: FinanceSnapshot[] }) {
  const points = history
    .map((s) => Number(s.net_worth))
    .filter((v) => Number.isFinite(v));

  return (
    <BentoCard animate={false} className="h-full">
      <BentoHeader icon={Activity} title="Net worth trend" />
      {points.length < 2 ? (
        <EmptyState
          title="Not enough history yet"
          hint="The trend appears once you have a couple of daily snapshots."
        />
      ) : (
        <Sparkline points={points} />
      )}
    </BentoCard>
  );
}

/** Minimal responsive sparkline (viewBox-scaled so it fills its container). */
function Sparkline({ points }: { points: number[] }) {
  const reduced = useReducedMotion();
  const W = 100;
  const H = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1; // avoid divide-by-zero on a flat line

  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((v - min) / span) * H + 2; // invert + 2px inset for stroke
    return [x, Math.max(2, Math.min(H + 2, y))] as const;
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${W},${H + 4} L0,${H + 4} Z`;

  // Re-draw key: changes when the series changes → triggers the draw animation
  // on refresh/value change only (component is otherwise static).
  const drawKey = points.join(",");
  const last = coords[coords.length - 1];

  return (
    <div className="pt-2">
      <svg
        viewBox={`0 0 ${W} ${H + 4}`}
        preserveAspectRatio="none"
        className="h-24 w-full overflow-visible"
        role="img"
        aria-label="Net worth trend sparkline"
      >
        <defs>
          <linearGradient id="spendtrend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spendtrend-fill)" stroke="none" />
        <motion.path
          key={drawKey}
          d={line}
          fill="none"
          stroke="#22D3EE"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: DUR.slow * 2.5, ease: [0.22, 1, 0.36, 1] }}
        />
        <circle
          cx={last[0]}
          cy={last[1]}
          r={2.25}
          fill="#22D3EE"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
