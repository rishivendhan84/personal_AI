import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * The hero. The single line of direction from the cached brief (PRD §7.1).
 * Visually dominant — it's the one thing the dashboard exists to surface.
 */
export function FocusCard({ focus }: { focus: string }) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-5 sm:p-6">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        Today&apos;s focus
      </div>
      <p className="mt-2 text-lg font-semibold leading-snug sm:text-2xl">{focus}</p>
    </Card>
  );
}
