/**
 * Central env access. Every integration is *env-gated*: a missing key means the
 * feature degrades gracefully (returns empty / mock-ish) instead of crashing.
 * Use `requireEnv` only at the boundary of an operation that genuinely cannot
 * proceed, and catch it so a single missing key never takes down a page.
 */

export function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

export function requireEnv(key: string): string {
  const v = env(key);
  if (!v) throw new Error(`[PAIOS] Missing required env var: ${key}`);
  return v;
}

/** Is a given provider/integration configured? Pages use this to show setup hints. */
export const configured = {
  supabase: () =>
    !!env("NEXT_PUBLIC_SUPABASE_URL") && !!env("SUPABASE_SERVICE_ROLE_KEY"),
  telegram: () => !!env("TELEGRAM_BOT_TOKEN"),
  groq: () => !!env("GROQ_API_KEY"),
  gemini: () => !!env("GEMINI_API_KEY"),
  openai: () => !!env("OPENAI_API_KEY"),
  qstash: () => !!env("QSTASH_TOKEN"),
  googleCalendar: () =>
    !!env("GOOGLE_CLIENT_ID") && !!env("GOOGLE_REFRESH_TOKEN"),
  googleSheets: () => !!env("GOOGLE_SHEETS_SPREADSHEET_ID"),
};
