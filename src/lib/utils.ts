import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner used across all UI primitives. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The single hardcoded user (PRD §4 — no auth, no multi-tenancy). */
export const USER_ID =
  process.env.PAIOS_USER_ID ?? "00000000-0000-0000-0000-000000000001";

/** Default timezone fallback if the user row hasn't loaded (Chennai, IST). */
export const DEFAULT_TZ = "Asia/Kolkata";

/** YYYY-MM-DD for a given date in a given IANA timezone (for log_date, brief_date). */
export function dateKeyInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
