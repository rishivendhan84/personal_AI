"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertTriangle } from "lucide-react";
import { SearchBox } from "@/components/brain/SearchBox";
import { AnswerCard } from "@/components/brain/AnswerCard";
import { SourceList } from "@/components/brain/SourceList";
import { bentoItem } from "@/lib/motion";
import type { BrainResult } from "@/lib/brain"; // type-only: server-only module, erased at build

const EXAMPLE_QUERIES = [
  "What are my open tasks due this week?",
  "Summarize my goals for this quarter",
  "Ideas I mentioned in voice memos last month",
  "What did I journal about the launch?",
];

/** Subtle shimmer placeholder shown while the Brain is thinking. */
function LoadingState() {
  return (
    <div
      className="glass gradient-border relative overflow-hidden rounded-card p-6 shadow-card"
      role="status"
      aria-label="Searching your second brain"
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles className="h-4 w-4 animate-pulse text-violet" />
        Searching your second brain…
      </div>
      <div className="space-y-3">
        {["w-full", "w-11/12", "w-4/5", "w-2/3"].map((w, i) => (
          <div
            key={i}
            className={`relative h-3.5 overflow-hidden rounded-chip bg-white/5 ${w}`}
          >
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}

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

  async function run(override?: string) {
    const query = (override ?? q).trim();
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
    <div className="mx-auto max-w-3xl">
      {/* Hero header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="text-shimmer">Brain</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Ask anything. The Brain routes your question to your tasks, goals, and
          memories — and answers with citations.
        </p>
      </div>

      <SearchBox value={q} onChange={setQ} onSubmit={run} loading={loading} />

      <div className="mt-8">
        {loading && <LoadingState />}

        {!loading && error && (
          <div className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <div>
              <p className="font-medium text-foreground">Couldn&apos;t search</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && result && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={bentoItem}
            className="space-y-5"
          >
            <AnswerCard answer={result.answer} route={result.route} />
            {result.sources.length > 0 ? (
              <SourceList sources={result.sources} />
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No matching sources. Try rephrasing, or capture more notes and
                tasks first.
              </p>
            )}
          </motion.div>
        )}

        {!loading && !error && !result && !asked && (
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Try asking
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {EXAMPLE_QUERIES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setQ(ex);
                    void run(ex);
                  }}
                  className="glass gradient-border rounded-chip px-3.5 py-2 text-left text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
