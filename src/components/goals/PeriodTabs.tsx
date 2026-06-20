"use client";

import { motion } from "framer-motion";
import type { GoalType } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motion";

const TABS: { value: GoalType; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

/**
 * Segmented control for the Goals card. A single violet "pill" slides between
 * the two periods via a shared-element `layoutId` (transform only). The active
 * count rides along in mono, tabular.
 */
export function PeriodTabs({
  value,
  counts,
  onChange,
}: {
  value: GoalType;
  counts: Record<GoalType, number>;
  onChange: (next: GoalType) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label="Goal period"
      className="glass inline-flex items-center gap-1 rounded-chip p-1"
    >
      {TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative z-10 inline-flex items-center gap-2 rounded-chip px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
              active ? "text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="period-tab-indicator"
                className="absolute inset-0 -z-10 rounded-chip bg-violet shadow-glow-violet"
                transition={
                  reduced
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34 }
                }
              />
            )}
            <span>{tab.label}</span>
            <span
              className={cn(
                "font-mono text-xs tabular-nums",
                active ? "text-white/80" : "text-muted-foreground/70"
              )}
            >
              {counts[tab.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
