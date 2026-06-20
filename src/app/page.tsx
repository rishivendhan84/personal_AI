import { CalendarClock } from "lucide-react";
import { getLatestBrief } from "@/lib/brief";
import { getAdminClient } from "@/lib/db/server";
import { USER_ID, DEFAULT_TZ, dateKeyInTz } from "@/lib/utils";
import type { User, CalendarEvent } from "@/lib/db/types";
import { SetupHint } from "@/components/ui/page";
import { ProfileBar } from "@/components/dashboard/ProfileBar";
import { FocusCard } from "@/components/dashboard/FocusCard";
import { Top3Card } from "@/components/dashboard/Top3Card";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { HabitSummary } from "@/components/dashboard/HabitSummary";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { OverdueCard } from "@/components/dashboard/OverdueCard";
import { GenerateBriefButton } from "@/components/dashboard/GenerateBriefButton";

/**
 * Operator Dashboard (PRD §7.1). The first stop every morning, so it MUST be
 * fast: a server component that reads the *cached* brief + user + today's events
 * directly — it NEVER calls AI on load (§5, §12). Generation happens out-of-band
 * via /api/cron/brief; here we only render the snapshot.
 */
export const dynamic = "force-dynamic"; // always reflect the latest cached brief

export default async function DashboardPage() {
  const db = getAdminClient();

  // No DB → show the static shell + setup hint instead of crashing.
  if (!db) {
    return (
      <div className="space-y-5">
        <ProfileBar user={null} />
        <SetupHint
          what="PAIOS"
          vars={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]}
        />
      </div>
    );
  }

  // Fetch the three cheap reads in parallel. No AI anywhere on this path.
  const [brief, userRes, events] = await Promise.all([
    getLatestBrief(),
    db.from("users").select("*").eq("id", USER_ID).maybeSingle<User>(),
    todayEvents(db),
  ]);
  const user = userRes.data;

  return (
    <div className="space-y-5">
      <ProfileBar user={user} />

      {!brief ? (
        <EmptyStateWithAction />
      ) : (
        <>
          <FocusCard focus={brief.content.focus} />
          <OverdueCard overdue={brief.content.overdue} />

          {/* Tight scannable grid: priorities lead, supporting cards fill in. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <Top3Card top3={brief.content.top3} />
            </div>
            <UpcomingEvents events={events} timeZone={user?.timezone} />
            <HabitSummary habits={brief.content.habits} />
            <div className="sm:col-span-2 lg:col-span-3">
              <GoalProgress goals={brief.content.goal_progress} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Today's events, in the user's tz, straight from the cache. */
async function todayEvents(
  db: NonNullable<ReturnType<typeof getAdminClient>>
): Promise<CalendarEvent[]> {
  const { data: user } = await db
    .from("users")
    .select("timezone")
    .eq("id", USER_ID)
    .maybeSingle<Pick<User, "timezone">>();
  const tz = user?.timezone ?? DEFAULT_TZ;
  const todayKey = dateKeyInTz(new Date(), tz);
  const { data } = await db
    .from("calendar_events")
    .select("*")
    .gte("start_at", `${todayKey}T00:00:00`)
    .lte("start_at", `${todayKey}T23:59:59`)
    .order("start_at");
  return (data ?? []) as CalendarEvent[];
}

/** Friendly empty state when no brief has been generated yet (§7.1). */
function EmptyStateWithAction() {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 text-base font-medium">No brief yet for today</p>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">
        Generate your daily brief to see your focus, priorities, and schedule.
      </p>
      <GenerateBriefButton />
    </div>
  );
}
