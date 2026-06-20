import { route, ok } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { getTodayBrief, pushNudge } from "@/lib/direction";

export const runtime = "nodejs";

/**
 * Evening review prompt (~21:00, PRD §7.0 + §8.2 feedback loop). Reads today's
 * brief top-3 and asks the one closing question: "Did you do your top 3?". This
 * route only POSES the prompt — the answer comes back via POST /api/reviews,
 * which writes daily_reviews and feeds tomorrow's ranking (recent_deferrals, w6).
 * Single-action framing: one reply, not a form. Records nudges type=evening.
 */
async function run() {
  const db = getAdminClient();
  if (!db) return ok({ skipped: "db not configured" });

  const brief = await getTodayBrief();
  if (!brief || brief.top3.length === 0) {
    return ok({ skipped: "no brief/top3 for today" });
  }

  const list = brief.top3.map((t, i) => `${i + 1}. ${t.title}`).join("\n");
  const text = `🌙 *Evening review.* Did you do your top 3? Reply ✅/❌ for each:\n${list}`;

  await pushNudge("evening", text);
  return ok({ asked: brief.top3.length });
}

export const GET = route(run);
export const POST = route(run);
