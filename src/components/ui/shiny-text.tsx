"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motion";

/** Shiny gradient sweep text (Operator greeting). Runs once on load. */
export function ShinyText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-shimmer", className)}>{children}</span>;
}

/**
 * Split-text reveal: each word fades/blurs up in sequence. Used once for the
 * greeting headline. Reduced-motion renders the text statically.
 */
export function SplitText({ text, className }: { text: string; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <span className={className}>{text}</span>;
  const words = text.split(" ");
  return (
    <span className={cn("inline-flex flex-wrap", className)}>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          className="mr-[0.25em] inline-block"
          initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}
