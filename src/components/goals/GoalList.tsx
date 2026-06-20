"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GoalProject, GoalType } from "@/lib/db/types";
import { EmptyState } from "@/components/ui/page";
import { useReducedMotion, DUR } from "@/lib/motion";
import type { GoalWithDetail } from "@/app/api/goals/route";
import { GoalCard } from "./GoalCard";
import { NewGoalForm } from "./NewGoalForm";
import { PeriodTabs } from "./PeriodTabs";

/**
 * Goals client shell. Holds goal state locally so create / add-project / reset /
 * delete feel instant, then persists (API contracts unchanged). Weekly/Monthly
 * animated tabs scope the list; switching periods cross-fades the cards.
 */
export function GoalList({ initialGoals }: { initialGoals: GoalWithDetail[] }) {
  const reduced = useReducedMotion();
  const [goals, setGoals] = useState<GoalWithDetail[]>(initialGoals);
  const [period, setPeriod] = useState<GoalType>("weekly");

  function addGoal(goal: GoalWithDetail) {
    setGoals((prev) => [goal, ...prev]);
    setPeriod(goal.type); // surface the newly created goal under its tab
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

  const counts = useMemo<Record<GoalType, number>>(
    () => ({
      weekly: goals.filter((g) => g.type === "weekly").length,
      monthly: goals.filter((g) => g.type === "monthly").length,
    }),
    [goals]
  );

  const visible = useMemo(() => goals.filter((g) => g.type === period), [goals, period]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodTabs value={period} counts={counts} onChange={setPeriod} />
        <NewGoalForm onCreated={addGoal} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={period}
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 1 } : { opacity: 0, y: -6 }}
          transition={reduced ? { duration: 0 } : { duration: DUR.base, ease: [0.22, 1, 0.36, 1] }}
        >
          {visible.length === 0 ? (
            <EmptyState
              title={`No ${period} goals yet`}
              hint="Add a goal, then break it into projects and link tasks."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((g) => (
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
