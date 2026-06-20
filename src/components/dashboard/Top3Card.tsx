import { ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/page";
import type { DailyBriefContent } from "@/lib/db/types";

/** The day's top 3 priorities from the brief, each with its ranking reason. */
export function Top3Card({ top3 }: { top3: DailyBriefContent["top3"] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          Top 3 priorities
        </CardTitle>
      </CardHeader>
      <CardContent>
        {top3.length === 0 ? (
          <EmptyState title="Nothing ranked yet" hint="Capture a task to get going." />
        ) : (
          <ol className="space-y-2.5">
            {top3.map((t, i) => (
              <li key={t.id} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{t.title}</p>
                  {t.reason && (
                    <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                      {t.reason}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
