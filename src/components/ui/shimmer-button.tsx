"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shimmer button — a moving sheen across a glass surface. For special CTAs
 * (Finance refresh, command-menu trigger). Pair `loading` with a spin state.
 */
export const ShimmerButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }
>(({ className, children, loading, disabled, ...props }, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={cn(
      "group relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-chip border border-foreground/10 bg-foreground/[0.04] px-4 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-foreground/[0.08] disabled:opacity-60",
      className
    )}
    {...props}
  >
    <span className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    <span className={cn("relative flex items-center gap-2", loading && "opacity-80")}>{children}</span>
  </button>
));
ShimmerButton.displayName = "ShimmerButton";
