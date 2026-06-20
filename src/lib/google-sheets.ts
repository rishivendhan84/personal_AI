import "server-only";
import { google } from "googleapis";
import { env, configured } from "@/lib/env";
import { parseAmount, type RawTxn } from "@/lib/finance";

/**
 * Google Sheets client (server-only, env-gated, PRD §7.6). Read-only: we pull the
 * finance sheet so /api/finance/refresh can categorize + deterministically sum it.
 * Reuses the same OAuth2 refresh-token creds as Google Calendar
 * (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN).
 *
 * Never crashes when unconfigured — readTransactions() returns [] so the refresh
 * route degrades to {skipped} instead of throwing.
 *
 * Expected columns (header row, case-insensitive): Date, Description, Amount,
 * Type (asset|liability|income|expense), Category. Extra columns are ignored.
 */

/** Build an OAuth2-authed Sheets client from refresh-token creds. */
function makeClient() {
  const oauth2 = new google.auth.OAuth2(
    env("GOOGLE_CLIENT_ID"),
    env("GOOGLE_CLIENT_SECRET"),
    env("GOOGLE_REDIRECT_URI") // optional; unused for refresh-token flow
  );
  oauth2.setCredentials({ refresh_token: env("GOOGLE_REFRESH_TOKEN") });
  return google.sheets({ version: "v4", auth: oauth2 });
}

/** Normalize a raw type cell to one of our four buckets; default to "expense". */
function normalizeType(raw: string): RawTxn["type"] {
  const t = raw.trim().toLowerCase();
  if (t === "asset" || t === "assets") return "asset";
  if (t === "liability" || t === "liabilities" || t === "debt") return "liability";
  if (t === "income") return "income";
  return "expense";
}

/** Map header cells to column indices so column order in the sheet can vary. */
function headerIndex(header: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    idx[h.trim().toLowerCase()] = i;
  });
  return idx;
}

/**
 * Read all transaction/balance rows from the finance sheet.
 * Returns [] when GOOGLE_SHEETS_SPREADSHEET_ID isn't set (env-gated, no throw).
 */
export async function readTransactions(): Promise<RawTxn[]> {
  if (!configured.googleSheets()) return [];

  const sheets = makeClient();
  const spreadsheetId = env("GOOGLE_SHEETS_SPREADSHEET_ID")!;
  const range = env("GOOGLE_SHEETS_RANGE") ?? "Sheet1!A:E";

  const { data } = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = (data.values ?? []) as string[][];
  if (rows.length < 2) return []; // header only (or empty) → nothing to sum

  const idx = headerIndex(rows[0]);
  const di = idx["date"] ?? 0;
  const desc = idx["description"] ?? 1;
  const amt = idx["amount"] ?? 2;
  const ty = idx["type"] ?? 3;
  const cat = idx["category"] ?? 4;

  return rows
    .slice(1)
    .map((r): RawTxn | null => {
      const description = (r[desc] ?? "").trim();
      const amountCell = r[amt];
      // Skip blank rows (no description and no amount) — common trailing rows.
      if (!description && (amountCell === undefined || amountCell === "")) return null;
      const category = (r[cat] ?? "").trim();
      return {
        date: (r[di] ?? "").trim(),
        description: description || "(no description)",
        amount: parseAmount(amountCell), // deterministic numeric parse (finance.ts)
        type: normalizeType(r[ty] ?? ""),
        category: category.length > 0 ? category : null,
      };
    })
    .filter((t): t is RawTxn => t !== null);
}
