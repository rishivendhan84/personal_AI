"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motion";
import { ClickSpark } from "@/components/ui/click-spark";

/**
 * Big, mobile-first one-tap completion control — THE delight moment.
 *
 * On completion the ring fills with a spring (scale pop) and emits a violet
 * click-spark burst. Un-completing reverses the fill calmly with no spark.
 * Optimistic: flips its own visual state immediately and calls onToggle, which
 * performs the POST + refetch (realtime reconciles cross-device). Disabled while
 * in flight to prevent double-submits. Under reduced motion the fill is instant
 * and ClickSpark suppresses the burst (handled inside those primitives).
 */
export function HabitToggle({
  done,
  pending,
  onToggle,
  label,
  size = "md",
}: {
  done: boolean;
  pending?: boolean;
  onToggle: () => void;
  label: string;
  size?: "md" | "lg";
}) {
  const reduced = useReducedMotion();
  const dim = size === "lg" ? "h-24 w-24" : "h-20 w-20";
  const icon = size === "lg" ? "h-10 w-10" : "h-8 w-8";

  return (
    <ClickSpark
      // Spark only fires on completion (the satisfying moment), never on un-toggle.
      color="#7C5CFC"
      count={10}
      onClick={() => {
        if (pending) return;
        onToggle();
      }}
      className={cn(
        "group/toggle relative grid shrink-0 place-items-center rounded-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/70",
        "disabled:opacity-60",
        dim
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full border-2 transition-colors duration-200",
          done ? "border-violet" : "border-white/15 group-hover/toggle:border-violet/50"
        )}
      />

      {/* Spring fill: a violet disc that scales up from center on completion. */}
      <motion.span
        aria-hidden
        className="absolute inset-1 rounded-full bg-violet shadow-glow-violet"
        initial={false}
        animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : done
              ? { type: "spring", stiffness: 520, damping: 22, mass: 0.7 }
              : { type: "tween", duration: 0.22, ease: "easeOut" }
        }
        style={{ transformOrigin: "center" }}
      />

      <motion.span
        aria-hidden
        className="relative grid place-items-center"
        initial={false}
        animate={{ scale: done ? 1 : 0.9, opacity: done ? 1 : 0.35 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 20 }}
      >
        <Check
          className={cn(icon, "transition-colors", done ? "text-white" : "text-white/50")}
          strokeWidth={2.5}
        />
      </motion.span>

      <span className="sr-only">
        {done ? `Mark ${label} not done` : `Mark ${label} done`}
      </span>
    </ClickSpark>
  );
}
