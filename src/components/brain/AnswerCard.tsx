"use client";

import * as React from "react";
import { Sparkles, Database, Search as SearchIcon, Layers } from "lucide-react";
import { BentoCard } from "@/components/ui/bento-card";
import { cn } from "@/lib/utils";
import type { BrainRoute } from "@/lib/brain";

const ROUTE_META: Record<
  BrainRoute,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  structured: { label: "structured", icon: Database },
  vector: { label: "vector", icon: SearchIcon },
  mixed: { label: "mixed", icon: Layers },
};

/** Small violet pill showing which retrieval route the Brain used. */
function RouteBadge({ route }: { route: BrainRoute }) {
  const meta = ROUTE_META[route];
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-chip border border-violet/30 bg-violet/15 px-2.5 py-1 text-xs font-medium text-violet">
      <Icon className="h-3 w-3" />
      <span className="font-mono">{meta.label}</span>
    </span>
  );
}

/** Highlight [n] citation markers so they read as references, not literals. */
function renderWithCitations(text: string) {
  return text.split(/(\[\d+\])/g).map((part, i) =>
    /^\[\d+\]$/.test(part) ? (
      <sup
        key={i}
        className="mx-0.5 rounded-sm bg-violet/15 px-1 font-mono text-[0.65rem] tabular-nums text-violet"
      >
        {part}
      </sup>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

/**
 * The generated answer (with inline citations) plus a route badge for
 * transparency. When `answer` is null we're in search-only mode (no LLM) and the
 * page renders just the SourceList below this card instead.
 */
export function AnswerCard({
  answer,
  route,
  llm = true,
}: {
  answer: string | null;
  route: BrainRoute;
  /** Whether an LLM is configured — drives an honest no-answer message. */
  llm?: boolean;
}) {
  if (answer === null) {
    return (
      <BentoCard className="p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Search results
          </span>
          <RouteBadge route={route} />
        </div>
        <p className="text-sm text-muted-foreground">
          {llm
            ? "Couldn't compose an answer — showing the closest matches below."
            : "AI answers are off: no model key (GEMINI_API_KEY / GROQ_API_KEY) is reaching the server. Showing matched sources below."}
        </p>
      </BentoCard>
    );
  }

  return (
    <BentoCard glow className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-base font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-violet" />
          Answer
        </span>
        <RouteBadge route={route} />
      </div>
      <div
        className={cn(
          "whitespace-pre-wrap text-[0.95rem] leading-relaxed text-foreground/90"
        )}
      >
        {renderWithCitations(answer)}
      </div>
    </BentoCard>
  );
}
