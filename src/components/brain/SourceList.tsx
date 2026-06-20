"use client";

import * as React from "react";
import { CheckSquare, Target, BookOpen, Mic, StickyNote } from "lucide-react";
import { motion } from "framer-motion";
import { bentoContainer, bentoItem } from "@/lib/motion";
import type { Source } from "@/lib/brain";

const ICONS: Record<Source["type"], React.ComponentType<{ className?: string }>> = {
  task: CheckSquare,
  goal: Target,
  journal: BookOpen,
  voice: Mic,
  note: StickyNote,
};

/**
 * Renders the citation list. Numbering MUST match the [n] markers in the answer
 * (same order brain.ts fed the model), so the user can trace every claim.
 */
export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Sources
      </h2>
      <motion.ol
        variants={bentoContainer}
        initial="hidden"
        animate="show"
        className="space-y-2"
      >
        {sources.map((s, i) => {
          const Icon = ICONS[s.type] ?? StickyNote;
          return (
            <motion.li
              key={`${s.type}-${s.id}`}
              variants={bentoItem}
              className="glass gradient-border group relative flex gap-3 overflow-hidden rounded-panel p-3.5 text-sm transition-shadow duration-150 hover:shadow-glow-violet"
            >
              <span className="mt-0.5 shrink-0 font-mono text-xs tabular-nums text-violet">
                [{i + 1}]
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium text-foreground">
                    {s.title ?? s.snippet.slice(0, 60)}
                  </span>
                  <span className="ml-auto shrink-0 rounded-chip border border-white/10 bg-white/5 px-2 py-0.5 text-[0.7rem] capitalize text-muted-foreground">
                    {s.type}
                  </span>
                </div>
                {s.title && (
                  <p className="mt-1 line-clamp-2 text-muted-foreground">{s.snippet}</p>
                )}
              </div>
            </motion.li>
          );
        })}
      </motion.ol>
    </div>
  );
}
