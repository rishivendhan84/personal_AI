"use client";

import { CheckSquare, Target, BookOpen, Mic, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sources
      </h2>
      <ol className="space-y-2">
        {sources.map((s, i) => {
          const Icon = ICONS[s.type] ?? StickyNote;
          return (
            <li
              key={`${s.type}-${s.id}`}
              className="flex gap-3 rounded-md border border-border bg-card p-3 text-sm"
            >
              <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground">
                [{i + 1}]
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">
                    {s.title ?? s.snippet.slice(0, 60)}
                  </span>
                  <Badge variant="outline" className="ml-auto shrink-0 capitalize">
                    {s.type}
                  </Badge>
                </div>
                {s.title && (
                  <p className="mt-1 line-clamp-2 text-muted-foreground">{s.snippet}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
