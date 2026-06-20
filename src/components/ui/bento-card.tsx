"use client";
import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { bentoItem } from "@/lib/motion";

/**
 * The premium glass card used across the bento grid. Translucent fill +
 * backdrop blur + 1px gradient hairline border + soft elevation, with a slight
 * lift and violet border-glow on hover (120ms). Wrap a grid in a
 * motion element with `variants={bentoContainer}` to stagger these on entry.
 */
export const BentoCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** spans, e.g. "md:col-span-2 md:row-span-2" for the hero */
    span?: string;
    /** render an entry animation (default true) */
    animate?: boolean;
    /** show a subtle violet glow at rest (hero) */
    glow?: boolean;
  }
>(({ className, span, animate = true, glow = false, children, ...props }, ref) => {
  const Comp: typeof motion.div | "div" = animate ? motion.div : "div";
  const motionProps = animate ? { variants: bentoItem } : {};
  return (
    <Comp
      ref={ref as never}
      {...motionProps}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.12 }}
      className={cn(
        "glass gradient-border group relative overflow-hidden rounded-card p-6 shadow-card transition-shadow duration-150",
        "hover:shadow-glow-violet",
        glow && "shadow-glow-violet",
        span,
        className
      )}
      {...(props as object)}
    >
      {children}
    </Comp>
  );
});
BentoCard.displayName = "BentoCard";

/** Header row for a bento card: icon + title, optional "open" link/affordance. */
export function BentoHeader({
  icon: Icon,
  title,
  href,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  href?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {Icon && <Icon className="h-4 w-4 text-violet" />}
        <span>{title}</span>
      </div>
      {action ??
        (href ? (
          <Link
            href={href}
            className="text-muted-foreground/60 opacity-0 transition-opacity duration-150 hover:text-foreground group-hover:opacity-100"
            aria-label={`Open ${title}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : null)}
    </div>
  );
}
