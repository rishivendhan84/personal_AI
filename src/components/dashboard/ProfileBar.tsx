import { MapPin, Crosshair } from "lucide-react";
import { Clock } from "./Clock";
import type { User } from "@/lib/db/types";

/**
 * Top bar: who/where/now. Name + current focus + location on the left, live
 * clock on the right. The orienting glance you want first thing in the morning.
 */
export function ProfileBar({ user }: { user: User | null }) {
  const name = user?.name ?? "Operator";
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
          {greeting()}, {name.split(" ")[0]}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {user?.current_focus && (
            <span className="inline-flex items-center gap-1.5">
              <Crosshair className="h-3.5 w-3.5" />
              {user.current_focus}
            </span>
          )}
          {user?.current_location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {user.current_location}
            </span>
          )}
        </div>
      </div>
      <Clock timeZone={user?.timezone} />
    </div>
  );
}

/** Time-of-day greeting; computed server-side, close enough at page-load. */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
