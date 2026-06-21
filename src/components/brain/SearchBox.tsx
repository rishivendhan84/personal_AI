"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, Loader2, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion, DUR } from "@/lib/motion";

/**
 * The Brain's single affordance: a large, centered command-menu-style search
 * box. Glass fill wrapped in an animated gradient ring (violet → cyan) that
 * settles when reduced-motion is on. Enter or the inline button submits; the
 * parent owns state + the fetch, so this stays presentational.
 */
export function SearchBox({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const reduced = useReducedMotion();
  const canSubmit = !loading && value.trim().length > 0;

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && canSubmit) onSubmit();
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Animated gradient ring wrapper */}
      <div className="group relative rounded-card p-[1.5px]">
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-card opacity-70 transition-opacity duration-300 group-focus-within:opacity-100"
          style={{
            background:
              "linear-gradient(110deg, rgba(124,92,252,0.0) 20%, rgba(124,92,252,0.9) 45%, rgba(34,211,238,0.9) 55%, rgba(124,92,252,0.0) 80%)",
            backgroundSize: "220% 100%",
          }}
          animate={reduced ? undefined : { backgroundPosition: ["200% 0%", "-20% 0%"] }}
          transition={
            reduced
              ? undefined
              : { duration: 6, ease: "linear", repeat: Infinity }
          }
        />
        {/* Glass field */}
        <div className="glass relative flex items-center gap-3 rounded-card px-4 py-3 shadow-card sm:px-5 sm:py-4">
          <Search className="pointer-events-none h-5 w-5 shrink-0 text-violet" />
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask your second brain anything…"
            aria-label="Brain search"
            className={cn(
              "flex-1 bg-transparent text-base text-foreground outline-none",
              "placeholder:text-muted-foreground/70 sm:text-lg"
            )}
          />
          <button
            type="button"
            onClick={() => canSubmit && onSubmit()}
            disabled={!canSubmit}
            aria-label="Ask the Brain"
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-chip px-3 text-sm font-medium transition-colors duration-150",
              canSubmit
                ? "bg-violet text-white hover:bg-violet-hover"
                : "cursor-not-allowed bg-white/5 text-muted-foreground"
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">Ask</span>
                <CornerDownLeft className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Press{" "}
        <kbd className="rounded-chip border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[0.7rem] tabular-nums text-foreground">
          Ctrl K
        </kbd>{" "}
        anywhere for quick Brain access.
      </p>
    </div>
  );
}
