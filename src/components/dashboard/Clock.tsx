"use client";
import * as React from "react";

/**
 * Live ticking clock for the Operator hero. Client-only so it ticks without
 * re-rendering the server component. Updates every second; renders a stable
 * placeholder until mounted to avoid hydration mismatch (server vs client time).
 * All digits are mono + tabular per the design system.
 */
export function Clock({ timeZone }: { timeZone?: string }) {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    // Stable placeholder keeps layout from shifting on hydrate.
    return <div className="h-[22px] w-[120px]" aria-hidden />;
  }

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  return (
    <span className="font-mono text-lg tabular-nums leading-none tracking-tight text-foreground">
      {time}
    </span>
  );
}
