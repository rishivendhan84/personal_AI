"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/page";
import { SearchBox } from "@/components/brain/SearchBox";
import { AnswerCard } from "@/components/brain/AnswerCard";
import { SourceList } from "@/components/brain/SourceList";
import type { BrainResult } from "@/lib/brain"; // type-only: server-only module, erased at build

/**
 * Client shell for the Brain. Owns query state + the POST to /api/brain. Kept
 * separate from page.tsx so the page can stay a server component (env gating).
 */
export function BrainSearch() {
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<BrainResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [asked, setAsked] = React.useState(false);

  async function run() {
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    setAsked(true);
    try {
      const res = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Search failed");
      if (json.data?.skipped) {
        setError("Brain isn't configured.");
        setResult(null);
      } else {
        setResult(json.data as BrainResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <SearchBox value={q} onChange={setQ} onSubmit={run} loading={loading} />

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching your second brain…
        </div>
      )}

      {!loading && error && (
        <EmptyState title="Couldn't search" hint={error} />
      )}

      {!loading && !error && result && (
        <div className="space-y-5">
          <AnswerCard answer={result.answer} route={result.route} />
          {result.sources.length > 0 ? (
            <SourceList sources={result.sources} />
          ) : (
            <EmptyState
              title="No matches found"
              hint="Try rephrasing, or capture more notes and tasks first."
            />
          )}
        </div>
      )}

      {!loading && !error && !result && !asked && (
        <EmptyState
          title="Ask your second brain anything"
          hint="Structured questions hit your tasks & goals; fuzzy recall searches your notes, voice memos, and journal."
        />
      )}
    </div>
  );
}
