"use client";

import * as React from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * The Brain's single affordance: ask a question. Enter or the button submits.
 * Parent owns state + the fetch; this stays presentational.
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
  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !loading && value.trim()) onSubmit();
  }

  return (
    <div className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask your second brain… e.g. open interview prep tasks, or ideas I mentioned last month"
          className="h-11 pl-9 text-base"
          aria-label="Brain search"
        />
      </div>
      <Button
        onClick={onSubmit}
        disabled={loading || !value.trim()}
        className="h-11 px-5"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
      </Button>
    </div>
  );
}
