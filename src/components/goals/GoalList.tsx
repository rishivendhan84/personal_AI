"use client";

import { useState } from "react";
import type { GoalProject } from "@/lib/db/types";
import { EmptyState } from "@/components/ui/page";
import type { GoalWithDetail } from "@/app/api/goals/route";
import { GoalCard } from "./GoalCard";
import { NewGoalForm } from "./NewGoalForm";

/**
 * Goals client shell. Holds goal state locally so create / add-project / reset /
 * delete feel instant, then persists. Renders the grid of goal cards.
 */
export function GoalList({ initialGoals }: { initialGoals: GoalWithDetail[] }) {
  const [goals, setGoals] = useState<GoalWithDetail[]>(initialGoals);

  function addGoal(goal: GoalWithDetail) {
    setGoals((prev) => [goal, ...prev]);
  }

  function addProject(goalId: string, project: GoalProject) {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, projects: [...g.projects, project] } : g))
    );
  }

  async function resetGoal(goalId: string) {
    // Manual reset = move period_start to today (PRD §7.5: no auto-reset).
    const today = new Date().toISOString().slice(0, 10);
    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, period_start: today } : g)));
    await fetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period_start: today }),
    });
  }

  async function deleteGoal(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-4">
      <NewGoalForm onCreated={addGoal} />
      {goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          hint="Add a weekly or monthly goal, then break it into projects and link tasks."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onAddProject={addProject}
              onReset={resetGoal}
              onDelete={deleteGoal}
            />
          ))}
        </div>
      )}
    </div>
  );
}
