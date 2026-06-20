"use client";
import * as React from "react";

/**
 * Live clock for the dashboard. Client-only so it ticks without re-rendering the
 * server component. Renders nothing until mounted to avoid hydration mismatch
 * (server vs client time differ by the request latency).
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
    return <div className="h-9" aria-hidden />;
  }

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <div className="text-right">
      <div className="text-2xl font-semibold tabular-nums leading-none sm:text-3xl">{time}</div>
      <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{date}</div>
    </div>
  );
}
