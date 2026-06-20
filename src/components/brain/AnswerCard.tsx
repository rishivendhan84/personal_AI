"use client";

import * as React from "react";
import { Sparkles, Database, Search as SearchIcon, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BrainRoute } from "@/lib/brain";

const ROUTE_META: Record<
  BrainRoute,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  structured: { label: "Structured (SQL)", icon: Database },
  vector: { label: "Vector (semantic)", icon: SearchIcon },
  mixed: { label: "Mixed (hybrid)", icon: Layers },
};

/** Highlight [n] citation markers so they read as references, not literals. */
function renderWithCitations(text: string) {
  return text.split(/(\[\d+\])/g).map((part, i) =>
    /^\[\d+\]$/.test(part) ? (
      <sup key={i} className="mx-0.5 font-mono text-[0.65rem] text-primary">
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
}: {
  answer: string | null;
  route: BrainRoute;
}) {
  const meta = ROUTE_META[route];
  const RouteIcon = meta.icon;

  if (answer === null) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm text-muted-foreground">
            Search results
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <RouteIcon className="h-3 w-3" />
            {meta.label}
          </Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          AI answers are off (no model configured) — showing matched sources below.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Answer
        </CardTitle>
        <Badge variant="secondary" className="gap-1">
          <RouteIcon className="h-3 w-3" />
          {meta.label}
        </Badge>
      </CardHeader>
      <CardContent className={cn("whitespace-pre-wrap text-sm leading-relaxed")}>
        {renderWithCitations(answer)}
      </CardContent>
    </Card>
  );
}
