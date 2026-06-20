import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { generateAndStoreBrief } from "@/lib/brief";
import { pushNudge, userTz, getUser, timeInTz } from "@/lib/direction";
import type { DailyBriefContent } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Morning brief (~07:00, PRD §7.0). Assembles + persists the brief via the
 * shared `generateAndStoreBrief`, then pushes a CONCISE Telegram brief — focus
 * line first (the single next action), then the supporting top-3/events/overdue/
 * habits as a short scannable digest, not a data dump. Records nudges type=brief.
 */
function formatBrief(c: DailyBriefContent, tz: string): string {
  const lines: string[] = [];
  lines.push(`☀️ *Morning.* ${c.focus}`);

  if (c.top3.length) {
    lines.push("");
    lines.push("*Top 3:*");
    c.top3.forEach((t, i) => lines.push(`${i + 1}. ${t.title}`));
  }

  if (c.calendar.length) {
    lines.push("");
    lines.push("*Today:*");
    c.calendar.forEach((e) => lines.push(`• ${timeInTz(e.start_at, tz)} — ${e.title}`));
  }

  if (c.overdue.length) {
    lines.push("");
    lines.push(`⚠️ Overdue: ${c.overdue.length}`);
  }

  if (c.habits.length) {
    const done = c.habits.filter((h) => h.done).length;
    lines.push(`Habits: ${done}/${c.habits.length} done`);
  }

  return lines.join("\n");
}

async function run() {
  const db = getAdminClient();
  if (!db) return ok({ skipped: "db not configured" });

  const now = new Date();
  const content = await generateAndStoreBrief(now);
  const user = await getUser();
  const text = formatBrief(content, userTz(user));

  const { sent } = await pushNudge("brief", text);
  return ok({ sent, top3: content.top3.length });
}

export const GET = route(run);
export const POST = route(run);
