"use client";
import { useEffect, useState } from "react";
import type { Variants } from "framer-motion";

/**
 * Honor prefers-reduced-motion everywhere (design hard-constraint). Components
 * read this and drop non-essential motion when true.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Staggered fade/blur-up for bento cards on load (entry only, never ambient). */
export const bentoContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const bentoItem: Variants = {
  hidden: { opacity: 0, y: 8, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Standard interaction durations (120–280ms band — nothing theatrical). */
export const DUR = { fast: 0.12, base: 0.2, slow: 0.28 } as const;
