import Link from "next/link";
import { Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page";
import type { DailyBriefContent } from "@/lib/db/types";

/** Goal completion bars (deterministic % from the brief, no AI). */
export function GoalProgress({ goals }: { goals: DailyBriefContent["goal_progress"] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Target className="h-4 w-4 text-muted-foreground" />
          Goals
        </CardTitle>
        <Link href="/goals" className="text-xs text-muted-foreground hover:text-foreground">
          Goals →
        </Link>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <EmptyState title="No active goals" />
        ) : (
          <ul className="space-y-3">
            {goals.map((g) => (
              <li key={g.title}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{g.title}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{g.pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, g.pct))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
