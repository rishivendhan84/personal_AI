// AI never touches numbers — every figure here is a deterministic sum
// (PRD §6 principle 3). The AI layer is allowed to guess a *category label* for a
// transaction, but the math below (net worth, spend, breakdown, savings rate) is
// always a plain, reproducible computation over raw numbers. No AI imports here.

/** One raw transaction/balance row, as read from Google Sheets (numbers parsed). */
export interface RawTxn {
  date: string; // YYYY-MM-DD (or whatever the sheet provides; we only month-prefix match)
  description: string;
  amount: number; // signed magnitude; sign convention handled per `type` below
  type: "asset" | "liability" | "income" | "expense";
  category: string | null; // null = needs categorization (AI or keyword fallback)
}

/**
 * Coerce a sheet cell to a finite number. Strips currency symbols, thousands
 * separators and handles (parens) as negative. Returns 0 for unparseable input
 * so one bad cell can't NaN-poison an entire snapshot.
 */
export function parseAmount(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw !== "string") return 0;
  let s = raw.trim();
  if (!s) return 0;
  const negative = /^\(.*\)$/.test(s); // accounting-style negatives
  s = s.replace(/[()]/g, "").replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return negative ? -Math.abs(n) : n;
}

/**
 * Net worth = sum(assets) - sum(liabilities). Amounts are treated as magnitudes;
 * the `type` decides the sign, so the sheet can store everything as positives.
 */
export function computeNetWorth(txns: RawTxn[]): number {
  let assets = 0;
  let liabilities = 0;
  for (const t of txns) {
    if (t.type === "asset") assets += Math.abs(t.amount);
    else if (t.type === "liability") liabilities += Math.abs(t.amount);
  }
  return round2(assets - liabilities);
}

/**
 * Total expense spend for a given month. `month` is a "YYYY-MM" prefix; we match
 * it against the start of each txn's date string (deterministic, TZ-free).
 */
export function computeMonthlySpend(txns: RawTxn[], month: string): number {
  let spend = 0;
  for (const t of txns) {
    if (t.type !== "expense") continue;
    if (!t.date.startsWith(month)) continue;
    spend += Math.abs(t.amount);
  }
  return round2(spend);
}

/**
 * Expense totals grouped by category. Uncategorized rows fall into "Uncategorized"
 * so the breakdown always sums to total spend. Only expenses are broken down.
 */
export function computeCategoryBreakdown(txns: RawTxn[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of txns) {
    if (t.type !== "expense") continue;
    const key = t.category?.trim() || "Uncategorized";
    out[key] = round2((out[key] ?? 0) + Math.abs(t.amount));
  }
  return out;
}

/**
 * Savings rate = (income - spend) / income, clamped to [-1, 1]. Returns null when
 * there's no income to divide by (avoids a misleading Infinity/0 figure).
 */
export function computeSavingsRate(income: number, spend: number): number | null {
  if (income <= 0) return null;
  const rate = (income - spend) / income;
  return Math.max(-1, Math.min(1, rate));
}

/** Total income for a given "YYYY-MM" month — helper for savings rate. */
export function computeMonthlyIncome(txns: RawTxn[], month: string): number {
  let income = 0;
  for (const t of txns) {
    if (t.type !== "income") continue;
    if (!t.date.startsWith(month)) continue;
    income += Math.abs(t.amount);
  }
  return round2(income);
}

/**
 * Deterministic keyword categorizer — the fallback when AI is unavailable, and a
 * cheap first pass before AI. Returns a category label for an expense description.
 * Purely string -> string; never produces a number.
 */
const KEYWORD_RULES: { category: string; words: string[] }[] = [
  { category: "Groceries", words: ["grocery", "supermarket", "whole foods", "trader joe", "aldi", "costco"] },
  { category: "Dining", words: ["restaurant", "cafe", "coffee", "starbucks", "uber eats", "doordash", "grubhub", "bar"] },
  { category: "Transport", words: ["uber", "lyft", "gas", "fuel", "shell", "transit", "metro", "parking", "train"] },
  { category: "Housing", words: ["rent", "mortgage", "hoa", "landlord"] },
  { category: "Utilities", words: ["electric", "water", "internet", "comcast", "verizon", "att", "utility", "phone"] },
  { category: "Subscriptions", words: ["netflix", "spotify", "subscription", "icloud", "github", "openai", "notion"] },
  { category: "Health", words: ["pharmacy", "doctor", "gym", "fitness", "dental", "clinic", "cvs", "walgreens"] },
  { category: "Shopping", words: ["amazon", "target", "walmart", "store", "apple", "best buy"] },
  { category: "Travel", words: ["hotel", "airbnb", "flight", "airline", "expedia"] },
];

export function keywordCategorize(description: string): string {
  const d = description.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.words.some((w) => d.includes(w))) return rule.category;
  }
  return "Uncategorized";
}

/** The category set we expose to the AI prompt (so it returns a known label). */
export const KNOWN_CATEGORIES = KEYWORD_RULES.map((r) => r.category);

/** Round to cents to keep money math free of float drift. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
