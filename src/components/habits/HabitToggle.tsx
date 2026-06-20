"use client";
import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Big, mobile-first one-tap completion control. Optimistic: it flips its own
 * visual state immediately and calls onToggle, which performs the POST and a
 * refetch (realtime also reconciles cross-device). Disabled while in flight to
 * prevent double-submits.
 */
export function HabitToggle({
  done,
  pending,
  onToggle,
  label,
}: {
  done: boolean;
  pending?: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={done}
      aria-label={done ? `Mark ${label} not done` : `Mark ${label} done`}
      className={cn(
        "grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        done
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-border bg-background text-muted-foreground hover:border-emerald-600/60"
      )}
    >
      <Check className={cn("h-7 w-7 transition-opacity", done ? "opacity-100" : "opacity-30")} />
    </button>
  );
}
