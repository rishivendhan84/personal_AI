import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DailyBriefContent } from "@/lib/db/types";

/**
 * Compact overdue indicator. Hidden entirely when nothing is overdue — silence
 * is the good state, so we don't waste a card on "0 overdue".
 */
export function OverdueCard({ overdue }: { overdue: DailyBriefContent["overdue"] }) {
  if (overdue.length === 0) return null;
  return (
    <Link href="/tasks">
      <Card className="flex items-center gap-3 border-destructive/30 bg-destructive/10 p-4 transition-colors hover:bg-destructive/15">
        <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-destructive">
            {overdue.length} overdue {overdue.length === 1 ? "task" : "tasks"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {overdue.map((o) => o.title).join(" · ")}
          </p>
        </div>
      </Card>
    </Link>
  );
}
