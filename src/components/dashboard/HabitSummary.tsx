import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page";
import type { DailyBriefContent } from "@/lib/db/types";

/** Today's habit checklist from the brief snapshot, with a done/total tally. */
export function HabitSummary({ habits }: { habits: DailyBriefContent["habits"] }) {
  const done = habits.filter((h) => h.done).length;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          Habits
        </CardTitle>
        {habits.length > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {done}/{habits.length}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {habits.length === 0 ? (
          <EmptyState title="No active habits" />
        ) : (
          <ul className="space-y-1.5">
            {habits.map((h) => (
              <li key={h.name} className="flex items-center gap-2 text-sm">
                {h.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className={h.done ? "text-muted-foreground line-through" : ""}>
                  {h.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
