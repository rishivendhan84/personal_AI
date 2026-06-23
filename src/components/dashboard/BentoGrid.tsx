"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { bentoContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Client wrapper for the bento grid. A `motion.div` that stagger-fades-up its
 * children (each `BentoCard` reads `bentoItem`) on entry only — never ambient.
 * Responsive: 3 columns on desktop, 2 on tablet, 1 on mobile.
 */
export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={bentoContainer}
      initial="hidden"
      animate="show"
      className={cn(
        "grid auto-rows-[minmax(0,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/**
 * Top region of the dashboard: hero (2 cols) beside a stacked rail (1 col).
 * `items-start` keeps the columns height-independent — a tall rail never
 * stretches the hero and vice-versa (cards are "delinked").
 */
export function TopRegion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={bentoContainer}
      initial="hidden"
      animate="show"
      className={cn(
        "grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/**
 * A vertical rail that stacks tiles at their natural heights. Plain flexbox (no
 * grow) so siblings never stretch each other. `motion.div` so the parent's
 * stagger still reaches the cards inside.
 */
export function StackColumn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={cn("flex flex-col gap-4", className)}>{children}</motion.div>
  );
}

/**
 * Masonry region — CSS multi-columns. Each card flows independently into the
 * shortest column, so one card growing never changes a neighbour's height and
 * there are no row-alignment gaps. Used for the summary tiles.
 */
export function BentoMasonry({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={bentoContainer}
      initial="hidden"
      animate="show"
      className={cn(
        "columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
