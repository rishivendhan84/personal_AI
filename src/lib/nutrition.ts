import "server-only";
import { reason, aiAvailable } from "@/lib/ai";
import type { MacroTotals, NutritionLog } from "@/lib/db/types";

/**
 * Nutrition macro math + AI meal parsing (design v2).
 *
 * AI never touches numbers — totals are deterministic sums, PRD §6.
 * The LLM is only asked to *estimate* the macros of a single described meal
 * (a nutrition-facts lookup it's good at). All ADDING UP across the day happens
 * here in code so the daily totals are reproducible and never hallucinated.
 */

/** What the AI returns per meal / what an editable-chip insert carries. */
export interface MealMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const ZERO: MealMacros = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

/** Clamp to ≥0 and round (calories whole, grams to 1 decimal) so the DB never
 *  sees a negative or absurdly precise value, regardless of what the LLM emits. */
function sanitize(m: Partial<MealMacros> | null | undefined): MealMacros {
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const g = (v: unknown) => Math.round(Math.max(0, num(v)) * 10) / 10;
  return {
    calories: Math.round(Math.max(0, num(m?.calories))),
    protein_g: g(m?.protein_g),
    carbs_g: g(m?.carbs_g),
    fat_g: g(m?.fat_g),
  };
}

/**
 * Deterministic sum of a day's logged meals. Pure: same input → same totals.
 * AI never touches numbers — totals are deterministic sums, PRD §6.
 */
export function sumMacros(logs: Pick<NutritionLog, keyof MacroTotals>[]): MacroTotals {
  return logs.reduce<MacroTotals>(
    (acc, l) => ({
      calories: acc.calories + (Number(l.calories) || 0),
      protein_g: acc.protein_g + (Number(l.protein_g) || 0),
      carbs_g: acc.carbs_g + (Number(l.carbs_g) || 0),
      fat_g: acc.fat_g + (Number(l.fat_g) || 0),
    }),
    { ...ZERO }
  );
}

/** Round a summed total for display (totals are summed from rounded rows, but
 *  float accumulation can still introduce noise like 219.99999). */
export function roundTotals(t: MacroTotals): MacroTotals {
  return {
    calories: Math.round(t.calories),
    protein_g: Math.round(t.protein_g * 10) / 10,
    carbs_g: Math.round(t.carbs_g * 10) / 10,
    fat_g: Math.round(t.fat_g * 10) / 10,
  };
}

const SYSTEM = [
  "You are a nutrition estimator. Given a free-text description of a single meal,",
  "estimate its macronutrients. Reply with ONLY a JSON object, no prose, no markdown:",
  '{"calories": <int kcal>, "protein_g": <number>, "carbs_g": <number>, "fat_g": <number>}',
  "Estimate realistic per-serving values. Do not add commentary. Do not sum anything.",
].join(" ");

/** Pull the first JSON object out of a model reply, tolerating code fences/prose. */
function extractJson(raw: string): Partial<MealMacros> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Partial<MealMacros>;
  } catch {
    return null;
  }
}

/**
 * Estimate one meal's macros via the LLM. Returns zeros (user can edit) when no
 * LLM is configured or the reply can't be parsed — never throws on bad output.
 * The AI estimates per-item nutrition facts (allowed); summing stays in code.
 */
export async function estimateMeal(text: string): Promise<MealMacros> {
  const meal = text.trim();
  if (!meal) return { ...ZERO };
  if (!aiAvailable.llm()) return { ...ZERO };

  try {
    const raw = await reason({
      system: SYSTEM,
      prompt: `Meal: ${meal}`,
      json: true,
      maxTokens: 120,
    });
    return sanitize(extractJson(raw));
  } catch (e) {
    console.warn("[PAIOS:nutrition] estimateMeal failed, returning zeros:", e);
    return { ...ZERO };
  }
}

export { sanitize as sanitizeMacros };
