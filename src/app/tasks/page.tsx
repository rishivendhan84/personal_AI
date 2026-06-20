import { getAdminClient } from "@/lib/db/server";
import { PageHeader, SetupHint } from "@/components/ui/page";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import type { Goal, GoalProject, Task } from "@/lib/db/types";

export const dynamic = "force-dynamic"; // always reflect the latest tasks

/**
 * Tasks page (PRD §7.4). Server component: fetch initial board data directly via
 * the admin client (no fetch to our own API on the server — PRD convention),
 * then hand off to the interactive client board. Scores are read, never computed
 * here — the "Refresh priorities" button drives /api/prioritize on demand.
 */
export default async function TasksPage() {
  const db = getAdminClient();
  if (!db) {
    return (
      <>
        <PageHeader title="Tasks" description="Capture, prioritize, and move work forward." />
        <SetupHint what="Tasks" vars={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]} />
      </>
    );
  }

  const [tasksRes, goalsRes, projectsRes] = await Promise.all([
    db
      .from("tasks")
      .select("*")
      .order("ai_priority_score", { ascending: false, nullsFirst: false })
      .order("sort_order", { ascending: true }),
    db.from("goals").select("*").eq("status", "active").order("created_at", { ascending: false }),
    db.from("goal_projects").select("*").order("created_at", { ascending: true }),
  ]);

  const tasks = (tasksRes.data ?? []) as Task[];
  const goals = (goalsRes.data ?? []) as Goal[];
  const projects = (projectsRes.data ?? []) as GoalProject[];

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Tier board, list, or category — sorted by priority, linked to goals."
      />
      <TaskBoard initialTasks={tasks} goals={goals} projects={projects} />
    </>
  );
}
