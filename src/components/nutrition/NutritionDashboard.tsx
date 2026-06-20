"use client";
import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { Utensils } from "lucide-react";
import { BentoCard, BentoHeader } from "@/components/ui/bento-card";
import { EmptyState } from "@/components/ui/page";
import { MacroRing } from "@/components/nutrition/MacroRing";
import { CalorieTotal } from "@/components/nutrition/CalorieTotal";
import { MealInput } from "@/components/nutrition/MealInput";
import { MealRow } from "@/components/nutrition/MealRow";
import type { NutritionLog, NutritionTargets, MacroTotals } from "@/lib/db/types";
import type { NutritionView } from "@/app/api/nutrition/route";

type MacroKey = "calories" | "protein_g" | "carbs_g" | "fat_g";

const ZERO: MacroTotals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

/**
 * Client dashboard for the Nutrition card. Seeded with server-rendered logs +
 * deterministic totals + targets, then:
 *  - meal entry → POST /api/nutrition/log (AI-estimates macros) → refetch.
 *  - edit chips → re-POST corrected macros (delete old row, insert new) → refetch.
 *  - delete → remove the row → refetch.
 *
 * Totals are NEVER summed in the browser from AI output as the source of truth:
 * every change triggers a refetch of the server's deterministic `sumMacros`
 * result (PRD §6). Local sums are used only for an instant optimistic preview.
 */
export function NutritionDashboard({ initial }: { initial: NutritionView }) {
  const [logs, setLogs] = React.useState<NutritionLog[]>(initial.logs);
  const [totals, setTotals] = React.useState<MacroTotals>(initial.totals);
  const [targets] = React.useState<NutritionTargets>(initial.targets);
  const [pending, setPending] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // Pull authoritative state (totals re-summed server-side, deterministically).
  const refetch = React.useCallback(async () => {
    try {
      const res = await fetch("/api/nutrition", { cache: "no-store" });
      const json = await res.json();
      if (json?.ok && json.data) {
        setLogs(json.data.logs as NutritionLog[]);
        setTotals(json.data.totals as MacroTotals);
      }
    } catch {
      // Network hiccup — keep current state; next action recovers.
    }
  }, []);

  const addMeal = React.useCallback(
    async (meal: string) => {
      setPending(true);
      try {
        await fetch("/api/nutrition/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meal }),
        });
        await refetch();
      } catch {
        await refetch();
      } finally {
        setPending(false);
      }
    },
    [refetch]
  );

  // Delete a row via the server route (works under locked-down RLS — the
  // browser never touches the DB directly).
  const removeRow = React.useCallback(async (id: string) => {
    try {
      await fetch(`/api/nutrition/log?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch {
      /* ignore — refetch reconciles */
    }
  }, []);

  const deleteMeal = React.useCallback(
    async (id: string) => {
      setBusyId(id);
      // Optimistic removal for instant feedback.
      setLogs((prev) => prev.filter((l) => l.id !== id));
      try {
        await removeRow(id);
        await refetch();
      } catch {
        await refetch();
      } finally {
        setBusyId(null);
      }
    },
    [removeRow, refetch]
  );

  // Edit = delete old row + re-POST corrected macros (editable-chip path).
  const editMeal = React.useCallback(
    async (id: string, meal: string, macros: Record<MacroKey, number>) => {
      setBusyId(id);
      try {
        await removeRow(id);
        await fetch("/api/nutrition/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meal, ...macros }),
        });
        await refetch();
      } catch {
        await refetch();
      } finally {
        setBusyId(null);
      }
    },
    [removeRow, refetch]
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Calories hero */}
      <BentoCard span="lg:col-span-2" glow animate={false} className="flex flex-col gap-5">
        <CalorieTotal value={totals.calories} target={targets.calories} />
        <MealInput onSubmit={addMeal} pending={pending} />
      </BentoCard>

      {/* Macro rings */}
      <BentoCard animate={false} className="flex flex-col">
        <BentoHeader icon={Utensils} title="Macros" />
        <div className="grid grid-cols-3 gap-2">
          <MacroRing
            label="Protein"
            value={totals.protein_g}
            target={targets.protein_g}
            color="#7C5CFC"
          />
          <MacroRing
            label="Carbs"
            value={totals.carbs_g}
            target={targets.carbs_g}
            color="#22D3EE"
          />
          <MacroRing
            label="Fat"
            value={totals.fat_g}
            target={targets.fat_g}
            color="#FBBF24"
          />
        </div>
      </BentoCard>

      {/* Today's meals */}
      <BentoCard span="lg:col-span-3" animate={false}>
        <BentoHeader icon={Utensils} title="Today's meals" />
        {logs.length === 0 ? (
          <EmptyState
            title="No meals logged yet"
            hint="Describe what you ate above — macros are estimated automatically."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <MealRow
                  key={log.id}
                  log={log}
                  busy={busyId === log.id}
                  onDelete={deleteMeal}
                  onEdit={(meal, macros) => editMeal(log.id, meal, macros)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </BentoCard>
    </div>
  );
}
