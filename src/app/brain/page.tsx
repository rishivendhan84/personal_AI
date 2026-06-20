import { getAdminClient } from "@/lib/db/server";
import { PageHeader, SetupHint } from "@/components/ui/page";
import { BrainSearch } from "@/components/brain/BrainSearch";

/**
 * The Brain (PRD §7.7): one search box that replaces manual hunting through
 * tasks/notes. Server component so we can env-gate before shipping JS; the
 * interactive search lives in <BrainSearch />.
 */
export default function BrainPage() {
  const configured = getAdminClient() !== null;

  return (
    <div>
      <PageHeader
        title="Brain"
        description="Ask anything. The Brain routes your question to your tasks, goals, and memories — and answers with citations."
      />
      {configured ? (
        <BrainSearch />
      ) : (
        <SetupHint
          what="Brain"
          vars={[
            "NEXT_PUBLIC_SUPABASE_URL",
            "SUPABASE_SERVICE_ROLE_KEY",
            "GEMINI_API_KEY",
          ]}
        />
      )}
    </div>
  );
}
