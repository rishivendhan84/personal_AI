import type { TaskUrgency } from "@/lib/db/types";

/** Urgency tier → color + label (single source of truth, design spec). */
export const URGENCY: Record<
  TaskUrgency,
  { label: string; hex: string; text: string; dot: string; ring: string }
> = {
  today: {
    label: "Today",
    hex: "#F87171",
    text: "text-[#F87171]",
    dot: "bg-[#F87171]",
    ring: "ring-[#F87171]/40",
  },
  week: {
    label: "This Week",
    hex: "#7C5CFC",
    text: "text-[#7C5CFC]",
    dot: "bg-[#7C5CFC]",
    ring: "ring-[#7C5CFC]/40",
  },
  month: {
    label: "This Month",
    hex: "#22D3EE",
    text: "text-[#22D3EE]",
    dot: "bg-[#22D3EE]",
    ring: "ring-[#22D3EE]/40",
  },
  someday: {
    label: "Someday",
    hex: "#52525B",
    text: "text-[#52525B]",
    dot: "bg-[#52525B]",
    ring: "ring-[#52525B]/40",
  },
};

export const URGENCY_ORDER: TaskUrgency[] = ["today", "week", "month", "someday"];

/** The user's home timezone (Chennai, IST). Used for greetings/clock display. */
export const USER_TZ = "Asia/Kolkata";

/** Time-of-day greeting for the Operator hero. */
export function greeting(now: Date, tz = USER_TZ): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hour12: false }).format(now)
  );
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Winding down";
}
