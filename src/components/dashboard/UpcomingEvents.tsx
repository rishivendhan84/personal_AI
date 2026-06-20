import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page";
import type { CalendarEvent } from "@/lib/db/types";

/**
 * Today's events from cached `calendar_events`. Read-only; deep-links to the
 * full calendar. Times rendered in the user's tz.
 */
export function UpcomingEvents({
  events,
  timeZone,
}: {
  events: CalendarEvent[];
  timeZone?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          Today
        </CardTitle>
        <Link href="/calendar" className="text-xs text-muted-foreground hover:text-foreground">
          Calendar →
        </Link>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyState title="No events today" hint="Enjoy the open calendar." />
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-baseline gap-3 text-sm">
                <span className="w-16 shrink-0 tabular-nums text-muted-foreground">
                  {fmtTime(e.start_at, timeZone)}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function fmtTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
