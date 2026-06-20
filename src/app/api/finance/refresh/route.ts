import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { reason, aiAvailable } from "@/lib/ai";
import { readTransactions } from "@/lib/google-sheets";
import { DEFAULT_TZ, dateKeyInTz } from "@/lib/utils";
import {
  computeNetWorth,
  computeMonthlySpend,
  computeMonthlyIncome,
  computeCategoryBreakdown,
  computeSavingsRate,
  keywordCategorize,
  KNOWN_CATEGORIES,
  type RawTxn,
} from "@/lib/finance";

export const runtime = "nodejs";

/**
 * POST /api/finance/refresh (PRD §7.6) — the only place finance numbers are
 * (re)computed. Pipeline:
 *   1. Read raw rows from Google Sheets (skip cleanly if unconfigured).
 *   2. Categorize ONLY uncategorized expense *labels* — AI if available, else a
 *      deterministic keyword fallback. AI NEVER produces a number.
 *   3. Compute net worth / spend / breakdown / savings rate deterministically in
 *      finance.ts from the raw amounts.
 *   4. Upsert today's finance_snapshots row.
 *
 * Used by the manual "Refresh" button and a daily cron.
 */
export const POST = route(async () => {
  const db = getAdminClient();
  if (!db) return ok({ skipped: true });

  // 1. Read the sheet. Unconfigured → skip without error so the page still works.
  const txns = await readTransactions();
  if (txns.length === 0) {
    return ok({ skipped: "Google Sheets not configured (or sheet empty)" });
  }

  // 2. Categorize uncategorized expenses (labels only — never numbers).
  await categorizeExpenses(txns);

  // 3. Deterministic math (the heart of §7.6) — all from raw amounts.
  const today = dateKeyInTz(new Date(), DEFAULT_TZ);
  const month = today.slice(0, 7); // "YYYY-MM"
  const netWorth = computeNetWorth(txns);
  const monthlySpend = computeMonthlySpend(txns, month);
  const monthlyIncome = computeMonthlyIncome(txns, month);
  const categories = computeCategoryBreakdown(txns);
  const savingsRate = computeSavingsRate(monthlyIncome, monthlySpend);

  // 4. Upsert today's snapshot (one row per snapshot_date).
  const { data, error } = await db
    .from("finance_snapshots")
    .upsert(
      {
        snapshot_date: today,
        net_worth: netWorth,
        categories,
        monthly_spend: monthlySpend,
        savings_rate: savingsRate,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "snapshot_date" }
    )
    .select("*")
    .single();
  if (error) throw error;

  return ok({ snapshot: data, categorized: txns.length });
});

/**
 * Fill in `category` for expenses that lack one. We mutate `txns` in place so the
 * downstream sums see the labels. AI is used strictly to map description → a known
 * category STRING; if it returns anything off-list we fall back to the keyword
 * categorizer. (Persisting corrected categories upstream in the sheet is the
 * user's job — we only fill blanks, we never overwrite an existing category.)
 */
async function categorizeExpenses(txns: RawTxn[]): Promise<void> {
  const needs = txns.filter((t) => t.type === "expense" && !t.category);
  if (needs.length === 0) return;

  // No AI → deterministic keyword fallback for every blank.
  if (!aiAvailable.llm()) {
    for (const t of needs) t.category = keywordCategorize(t.description);
    return;
  }

  // Unique descriptions only — avoids re-asking for repeats (e.g. monthly rent).
  const uniqueDescs = Array.from(new Set(needs.map((t) => t.description)));
  let guesses: Record<string, string> = {};
  try {
    guesses = await classifyDescriptions(uniqueDescs);
  } catch (e) {
    // AI failed → degrade to keyword fallback rather than dropping the refresh.
    console.warn("[PAIOS:finance] AI categorization failed, using keywords:", e);
  }

  for (const t of needs) {
    const aiCat = guesses[t.description];
    // Accept only known labels; otherwise keyword fallback. AI output is a label,
    // never a number, and is validated against KNOWN_CATEGORIES.
    t.category =
      aiCat && KNOWN_CATEGORIES.includes(aiCat)
        ? aiCat
        : keywordCategorize(t.description);
  }
}

/** Ask the LLM for a category per description. Returns { description: category }. */
async function classifyDescriptions(descs: string[]): Promise<Record<string, string>> {
  const system =
    "You categorize personal finance transaction descriptions. " +
    "Return ONLY JSON: an object mapping each input description to exactly one " +
    `category from this list: ${KNOWN_CATEGORIES.join(", ")}, Uncategorized. ` +
    "Never output numbers, amounts, or any field other than the category string.";
  const prompt = `Categorize these descriptions:\n${JSON.stringify(descs)}`;

  const raw = await reason({ system, prompt, json: true, maxTokens: 512 });
  return parseGuesses(raw);
}

/** Defensively parse the model's JSON map; ignore non-string values. */
function parseGuesses(raw: string): Record<string, string> {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return {};
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}
