import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page";

/** Format a number as USD with cents (category scale). */
function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Spend-by-category breakdown (PRD §7.6) from the snapshot's `categories` jsonb.
 * The amounts were summed deterministically in finance.ts; here we only sort,
 * total, and draw proportional bars. AI may have *named* a category, never sized it.
 */
export function CategoryBreakdown({
  categories,
}: {
  categories: Record<string, number>;
}) {
  const entries = Object.entries(categories)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by category</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState title="No categorized spend yet" hint="Refresh to pull and categorize transactions." />
        ) : (
          <ul className="space-y-3">
            {entries.map(([name, amount]) => {
              const share = total > 0 ? amount / total : 0;
              return (
                <li key={name}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {usd(amount)}{" "}
                      <span className="text-xs">({Math.round(share * 100)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(2, share * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
