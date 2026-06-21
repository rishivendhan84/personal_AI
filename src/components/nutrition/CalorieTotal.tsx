"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { useReducedMotion, DUR } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The hero calorie readout: a large mono number that rolls ON CHANGE (CountUp,
 * animateOnMount={false}) against the daily target, plus a thin progress bar
 * that fills on change. No load animation; respects reduced-motion.
 */
export function CalorieTotal({
  value,
  target,
}: {
  value: number;
  target: number;
}) {
  const reduced = useReducedMotion();
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const remaining = Math.max(0, Math.round(target - value));
  const over = target > 0 && value > target;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Flame className="h-4 w-4 text-violet" />
        <span>Calories</span>
      </div>

      <div className="flex items-baseline gap-2">
        <CountUp
          value={value}
          decimals={0}
          animateOnMount={false}
          className={cn(
            "text-4xl font-semibold tabular-nums sm:text-5xl",
            over ? "text-caution" : "text-foreground"
          )}
        />
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          / {Math.round(target).toLocaleString()} kcal
        </span>
      </div>

      {/* progress bar — fills on change only */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
        <motion.div
          className={cn("h-full rounded-full", over ? "bg-caution" : "bg-violet")}
          initial={false}
          animate={{ width: `${pct * 100}%` }}
          transition={
            reduced ? { duration: 0 } : { duration: DUR.slow, ease: [0.22, 1, 0.36, 1] }
          }
          style={{ boxShadow: over ? undefined : "0 0 12px rgba(124,92,252,0.5)" }}
        />
      </div>

      <p className="font-mono text-xs tabular-nums text-muted-foreground">
        {over ? (
          <span className="text-caution">
            {Math.round(value - target).toLocaleString()} kcal over target
          </span>
        ) : (
          <>{remaining.toLocaleString()} kcal remaining</>
        )}
      </p>
    </div>
  );
}
