import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  className,
}: {
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground",
        className
      )}
    >
      <p className="font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1">{hint}</p>}
    </div>
  );
}

/** Shown when an integration's env vars are missing (env-gated, never crashes). */
export function SetupHint({ what, vars }: { what: string; vars: string[] }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <div>
        <p className="font-medium">{what} isn&apos;t configured yet.</p>
        <p className="mt-1 text-muted-foreground">
          Add{" "}
          {vars.map((v, i) => (
            <span key={v}>
              <code className="rounded bg-background px-1 py-0.5 text-xs">{v}</code>
              {i < vars.length - 1 ? ", " : ""}
            </span>
          ))}{" "}
          to <code className="rounded bg-background px-1 py-0.5 text-xs">.env.local</code>.
        </p>
      </div>
    </div>
  );
}
