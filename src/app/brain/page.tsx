import { getAdminClient } from "@/lib/db/server";
import { SetupHint } from "@/components/ui/page";
import { BrainSearch } from "@/components/brain/BrainSearch";

/**
 * The Brain (PRD §7.7): one search box that replaces manual hunting through
 * tasks/notes. Server component so we can env-gate before shipping JS; the
 * interactive search lives in <BrainSearch />.
 */
export default function BrainPage() {
  const configured = getAdminClient() !== null;

  if (!configured) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Brain</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Ask anything. The Brain routes your question to your tasks, goals, and
            memories — and answers with citations.
          </p>
        </div>
        <SetupHint
          what="Brain"
          vars={[
            "NEXT_PUBLIC_SUPABASE_URL",
            "SUPABASE_SERVICE_ROLE_KEY",
            "GEMINI_API_KEY",
          ]}
        />
      </div>
    );
  }

  return <BrainSearch />;
}
