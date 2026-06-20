import { route, ok, fail } from "@/lib/http";
import { getAdminClient } from "@/lib/db/server";
import { todayKey } from "@/lib/direction";
import type { DailyReview } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Evening-review answers (PRD §8.2 — the feedback loop). The evening cron only
 * POSES the question; the user's ✅/❌ reply lands here. We upsert daily_reviews
 * keyed on review_date (today, user tz) so a re-reply corrects rather than
 * duplicates. Completed top-3 items are marked done. This is what feeds
 * tomorrow's ranking: rankTasks penalises tasks that were top-3 but not
 * completed (recent_deferrals, w6).
 */
interface ReviewBody {
  top3_task_ids: string[];
  top3_completed: boolean[];
  notes?: string;
}

async function handlePost(req: Request) {
  const db = getAdminClient();
  if (!db) return ok({ skipped: "db not configured" });

  let body: ReviewBody;
  try {
    body = (await req.json()) as ReviewBody;
  } catch {
    return fail("invalid JSON body", 400);
  }

  const { top3_task_ids, top3_completed, notes } = body;
  if (!Array.isArray(top3_task_ids) || !Array.isArray(top3_completed)) {
    return fail("top3_task_ids and top3_completed must be arrays", 400);
  }
  if (top3_task_ids.length !== top3_completed.length) {
    return fail("top3_task_ids and top3_completed length mismatch", 400);
  }

  const reviewDate = await todayKey();

  const { data, error } = await db
    .from("daily_reviews")
    .upsert(
      {
        review_date: reviewDate,
        top3_task_ids,
        top3_completed,
        notes: notes ?? null,
      },
      { onConflict: "review_date" }
    )
    .select()
    .single<DailyReview>();

  if (error) return fail(error.message, 500);

  // Mark completed top-3 tasks done — keep the board honest with the review.
  const completedIds = top3_task_ids.filter((_, i) => top3_completed[i] === true);
  if (completedIds.length) {
    await db
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .in("id", completedIds);
  }

  return ok({ review: data, completed: completedIds.length });
}

async function handleGet() {
  const db = getAdminClient();
  if (!db) return ok({ skipped: "db not configured" });

  const { data } = await db
    .from("daily_reviews")
    .select("*")
    .order("review_date", { ascending: false })
    .limit(1)
    .maybeSingle<DailyReview>();

  return ok({ review: data ?? null });
}

export const POST = route(handlePost);
export const GET = route(handleGet);
