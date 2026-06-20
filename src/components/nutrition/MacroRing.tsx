"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { CountUp } from "@/components/ui/count-up";
import { useReducedMotion, DUR } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * A circular SVG macro ring: current grams vs target. The stroke animates its
 * dash-offset ON CHANGE only (never on mount), and the center number counts up
 * on change via <CountUp animateOnMount={false}>. Reduced-motion → snap, no anim.
 */
export function MacroRing({
  label,
  value,
  target,
  unit = "g",
  color,
  trackColor = "rgba(255,255,255,0.08)",
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
  /** ring stroke color (hex/css) */
  color: string;
  trackColor?: string;
}) {
  const reduced = useReducedMotion();

  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const offset = CIRC * (1 - pct);
  const over = target > 0 && value > target;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-28 w-28 sm:h-32 sm:w-32">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          {/* track */}
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={trackColor}
            strokeWidth="8"
          />
          {/* progress — animates dashoffset on change only */}
          <motion.circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: DUR.slow, ease: [0.22, 1, 0.36, 1] }
            }
            style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
          />
        </svg>
        {/* center readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <CountUp
            value={value}
            decimals={0}
            animateOnMount={false}
            className={cn(
              "text-xl font-semibold leading-none tabular-nums sm:text-2xl",
              over ? "text-caution" : "text-foreground"
            )}
          />
          <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            / {Math.round(target)}
            {unit}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
