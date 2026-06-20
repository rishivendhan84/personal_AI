"use client";
import * as React from "react";
import { Plus, Loader2, Utensils } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ShimmerButton } from "@/components/ui/shimmer-button";

/**
 * Free-text meal entry. On submit the parent POSTs to /api/nutrition/log (which
 * AI-estimates macros) and refetches. Disabled + spinner while pending.
 */
export function MealInput({
  onSubmit,
  pending,
}: {
  onSubmit: (meal: string) => Promise<void> | void;
  pending: boolean;
}) {
  const [meal, setMeal] = React.useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = meal.trim();
    if (!text || pending) return;
    setMeal("");
    await onSubmit(text);
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div className="relative flex-1">
        <Utensils className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={meal}
          onChange={(e) => setMeal(e.target.value)}
          placeholder="e.g. 2 eggs, toast & a banana"
          disabled={pending}
          aria-label="Describe a meal"
          className="h-10 pl-9"
        />
      </div>
      <ShimmerButton
        type="submit"
        loading={pending}
        disabled={!meal.trim()}
        className="h-10 shrink-0"
        aria-label="Add meal"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Add</span>
      </ShimmerButton>
    </form>
  );
}
