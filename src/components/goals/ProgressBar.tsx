"use client";

import { motion } from "framer-motion";
import { useReducedMotion, DUR } from "@/lib/motion";

/**
 * Deterministic progress bar (% of the goal's tasks done — computed server-side).
 * The accent fill animates from 0 to `pct` once on mount (width only), then sits
 * still. The figure is mono + tabular.
 */
export function ProgressBar({
  pct,
  done,
  total,
}: {
  pct: number;
  done: number;
  total: number;
}) {
  const reduced = useReducedMotion();

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-mono tabular-nums text-muted-foreground">
          {done}/{total} tasks
        </span>
        <span className="font-mono tabular-nums font-medium text-foreground">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet to-cyan"
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={reduced ? { duration: 0 } : { duration: DUR.slow, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
