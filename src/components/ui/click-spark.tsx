"use client";
import * as React from "react";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motion";

/**
 * Click-spark: a burst of short rays from the click point. This is THE one
 * place for delight (habit completion). Wrap any tappable element; call the
 * provided `spark()` on the success moment, or rely on the built-in onClick.
 */
export function ClickSpark({
  children,
  className,
  color = "#7C5CFC",
  count = 8,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
  count?: number;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);

  const handle = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (reduced) return;
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const id = Date.now();
      setBursts((b) => [...b, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 500);
    },
    [onClick, reduced]
  );

  return (
    <button ref={ref} type="button" onClick={handle} className={cn("relative", className)}>
      {children}
      <AnimatePresence>
        {bursts.map((b) => (
          <span key={b.id} className="pointer-events-none absolute" style={{ left: b.x, top: b.y }}>
            {Array.from({ length: count }).map((_, i) => {
              const angle = (i / count) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="absolute h-[2px] w-3 rounded-full"
                  style={{ background: color, rotate: `${(angle * 180) / Math.PI}deg` }}
                  initial={{ opacity: 1, scale: 0.4, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: 1,
                    x: Math.cos(angle) * 18,
                    y: Math.sin(angle) * 18,
                  }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              );
            })}
          </span>
        ))}
      </AnimatePresence>
    </button>
  );
}
