"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion, DUR } from "@/lib/motion";
import type { NutritionLog } from "@/lib/db/types";

type MacroKey = "calories" | "protein_g" | "carbs_g" | "fat_g";

const FIELDS: { key: MacroKey; label: string; unit: string; color: string }[] = [
  { key: "calories", label: "kcal", unit: "", color: "text-foreground" },
  { key: "protein_g", label: "P", unit: "g", color: "text-violet" },
  { key: "carbs_g", label: "C", unit: "g", color: "text-cyan" },
  { key: "fat_g", label: "F", unit: "g", color: "text-caution" },
];

/**
 * One logged meal as a glass row with editable macro chips. "Edit" reveals
 * inline number inputs; saving re-POSTs the corrected macros (the editable-chip
 * path on /api/nutrition/log) so totals re-sum deterministically in code.
 */
export function MealRow({
  log,
  onEdit,
  onDelete,
  busy,
}: {
  log: NutritionLog;
  onEdit: (meal: string, macros: Record<MacroKey, number>) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  busy: boolean;
}) {
  const reduced = useReducedMotion();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<MacroKey, string>>({
    calories: String(log.calories),
    protein_g: String(log.protein_g),
    carbs_g: String(log.carbs_g),
    fat_g: String(log.fat_g),
  });

  const startEdit = () => {
    setDraft({
      calories: String(log.calories),
      protein_g: String(log.protein_g),
      carbs_g: String(log.carbs_g),
      fat_g: String(log.fat_g),
    });
    setEditing(true);
  };

  const save = async () => {
    const num = (s: string) => Math.max(0, Number(s) || 0);
    await onEdit(log.meal, {
      calories: num(draft.calories),
      protein_g: num(draft.protein_g),
      carbs_g: num(draft.carbs_g),
      fat_g: num(draft.fat_g),
    });
    setEditing(false);
  };

  return (
    <motion.li
      layout={!reduced}
      initial={false}
      transition={{ duration: reduced ? 0 : DUR.base, ease: [0.22, 1, 0.36, 1] }}
      className="glass flex flex-col gap-2 rounded-panel px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{log.meal}</span>
        <div className="flex shrink-0 items-center gap-1">
          {editing ? (
            <>
              <button
                onClick={() => void save()}
                disabled={busy}
                aria-label="Save macros"
                className="rounded-md p-1.5 text-positive transition-colors hover:bg-white/[0.06] disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setEditing(false)}
                aria-label="Cancel edit"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06]"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEdit}
                disabled={busy}
                aria-label="Edit macros"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => void onDelete(log.id)}
                disabled={busy}
                aria-label="Delete meal"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FIELDS.map((f) =>
          editing ? (
            <label
              key={f.key}
              className="flex items-center gap-1 rounded-chip border border-white/10 bg-white/[0.04] px-2 py-1"
            >
              <span className={cn("text-[10px] font-medium", f.color)}>{f.label}</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={draft[f.key]}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                }
                className="w-12 bg-transparent font-mono text-xs tabular-nums outline-none"
              />
            </label>
          ) : (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 rounded-chip border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-xs tabular-nums"
            >
              <span className={cn("font-medium", f.color)}>{f.label}</span>
              <span className="text-foreground">
                {log[f.key]}
                {f.unit}
              </span>
            </span>
          )
        )}
      </div>
    </motion.li>
  );
}
