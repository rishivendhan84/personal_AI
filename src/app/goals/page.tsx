import { getAdminClient } from "@/lib/db/server";
import { PageHeader, SetupHint } from "@/components/ui/page";
import { GoalList } from "@/components/goals/GoalList";
import type { Goal, GoalProject, Task } from "@/lib/db/types";
import type { GoalWithDetail } from "@/app/api/goals/route";

export const dynamic = "force-dynamic"; // progress reflects current task state

/**
 * Goals page (PRD §7.5). Server component: load goals + projects + task stats
 * directly and assemble the Goal → Projects → Tasks hierarchy with a
 * deterministic progress % (count of done tasks / total). Mirrors the shape the
 * goals API returns so the client list stays in sync after mutations.
 */
export default async function GoalsPage() {
  const db = getAdminClient();
  if (!db) {
    return (
      <>
        <PageHeader title="Goals" description="Weekly and monthly goals, broken into projects." />
        <SetupHint what="Goals" vars={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]} />
      </>
    );
  }

  const [goalsRes, projectsRes, tasksRes] = await Promise.all([
    db.from("goals").select("*").order("created_at", { ascending: false }),
    db.from("goal_projects").select("*").order("created_at", { ascending: true }),
    db.from("tasks").select("goal_id,status"),
  ]);

  const goals = (goalsRes.data ?? []) as Goal[];
  const projects = (projectsRes.data ?? []) as GoalProject[];
  const taskStats = (tasksRes.data ?? []) as Pick<Task, "goal_id" | "status">[];

  const initialGoals: GoalWithDetail[] = goals.map((g) => {
    const goalTasks = taskStats.filter((t) => t.goal_id === g.id);
    const total = goalTasks.length;
    const done = goalTasks.filter((t) => t.status === "done").length;
    return {
      ...g,
      projects: projects.filter((p) => p.goal_id === g.id),
      progress: { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) },
    };
  });

  return (
    <>
      <PageHeader
        title="Goals"
        description="Goal → Projects → Tasks. Progress is the share of linked tasks completed."
      />
      <GoalList initialGoals={initialGoals} />
    </>
  );
}
