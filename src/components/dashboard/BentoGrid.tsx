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
