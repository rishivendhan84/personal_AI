import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Current-streak readout for a habit tile. The current streak leads, large and
 * in tabular mono so digits never jiggle as they change; a flame indicator warms
 * up once the streak is live (and glows hot past a week). Longest streak rides
 * underneath as a quiet record, never competing with "current".
 */
export function StreakBadge({
  current,
  longest,
  className,
}: {
  current: number;
  longest: number;
  className?: string;
}) {
  const live = current > 0;
  const hot = current >= 7;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Flame
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          hot ? "text-violet" : live ? "text-cyan" : "text-white/25"
        )}
        fill={live ? "currentColor" : "none"}
      />
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-lg font-semibold leading-none tabular-nums",
            live ? "text-foreground" : "text-white/40"
          )}
        >
          {current}
        </span>
        <span className="text-xs text-muted-foreground">
          day{current === 1 ? "" : "s"}
        </span>
        {longest > 0 && (
          <span className="ml-1 text-[11px] text-muted-foreground/70">
            best <span className="font-mono tabular-nums">{longest}</span>
          </span>
        )}
      </div>
    </div>
  );
}
