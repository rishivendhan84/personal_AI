import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Server-side Supabase admin client (service-role). Used by API routes, cron
 * jobs, and the capture pipeline. Single-user app, so we bypass RLS and trust
 * the server boundary. NEVER import this into a client component.
 *
 * Returns null when Supabase isn't configured so callers can degrade gracefully
 * instead of throwing on every page load.
 */
let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient | null {
  if (cached) return cached;
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Throwing variant for operations that genuinely cannot proceed without the DB. */
export function requireAdminClient(): SupabaseClient {
  const c = getAdminClient();
  if (!c)
    throw new Error(
      "[PAIOS] Supabase not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  return c;
}
