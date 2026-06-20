import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Current-streak badge for a habit card. Visual heat scales with the streak:
 * 0 stays muted/outline, anything live turns warm. Longest is shown as a quiet
 * subtitle so the user can see their record without it competing with "current".
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
  const hot = current >= 7;
  const live = current > 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        variant={live ? (hot ? "warning" : "success") : "outline"}
        className="gap-1"
      >
        <Flame className={cn("h-3 w-3", !live && "opacity-50")} />
        {current} day{current === 1 ? "" : "s"}
      </Badge>
      {longest > 0 && (
        <span className="text-xs text-muted-foreground">best {longest}</span>
      )}
    </div>
  );
}
