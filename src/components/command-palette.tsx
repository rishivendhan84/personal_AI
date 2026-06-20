"use client";
import { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  Brain,
  Calendar,
  CheckCircle2,
  ListTodo,
  Target,
  Wallet,
  LayoutDashboard,
  Utensils,
  Search,
  Loader2,
  Sparkles,
  CornerDownLeft,
} from "lucide-react";

/**
 * ⌘K command palette — the "operator" entry point AND the Brain search surface
 * (design: "command palette doubles as the Brain search entry"). Navigation is
 * instant; asking the Brain calls /api/brain inline and renders a cited answer.
 */

const NAV = [
  { href: "/", label: "Operator", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/habits", label: "Habits", icon: CheckCircle2 },
  { href: "/nutrition", label: "Nutrition", icon: Utensils },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/brain", label: "Brain", icon: Brain },
];

type BrainResult = { answer: string | null; sources: { snippet?: string; title?: string }[]; route?: string };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrainResult | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("paios:cmdk", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("paios:cmdk", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResult(null);
      setLoading(false);
    }
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const askBrain = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/brain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q }),
      });
      const json = await res.json();
      setResult(json?.data ?? { answer: "No response.", sources: [] });
    } catch {
      setResult({ answer: "Brain is unavailable right now.", sources: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      shouldFilter={!query.startsWith(">") /* keep brain query unfiltered */}
      className="fixed left-1/2 top-[18%] z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-card border border-white/10 bg-[#111113]/90 shadow-glow-violet backdrop-blur-2xl data-[state=open]:animate-fade-up"
    >
      {/* dim backdrop */}
      <div
        className="fixed inset-0 -z-10 bg-black/50"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div className="flex items-center gap-2 border-b border-white/10 px-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Command.Input
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim() && !result) {
              // Default Enter when nothing highlighted → ask the Brain.
            }
          }}
          placeholder="Search, jump to a card, or ask your Brain…"
          className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          ESC
        </kbd>
      </div>

      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        {query.trim() && (
          <Command.Group heading="Brain" className="px-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <Command.Item
              value={`ask ${query}`}
              onSelect={askBrain}
              className="flex cursor-pointer items-center gap-3 rounded-panel px-3 py-2.5 text-sm text-foreground aria-selected:bg-white/[0.06]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-violet" />
              ) : (
                <Sparkles className="h-4 w-4 text-violet" />
              )}
              <span className="flex-1 truncate">
                Ask the Brain: <span className="text-muted-foreground">“{query}”</span>
              </span>
              <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </Command.Item>
          </Command.Group>
        )}

        {result && (
          <div className="mx-2 my-2 rounded-panel border border-white/10 bg-white/[0.02] p-3 text-sm">
            {result.route && (
              <span className="mb-2 inline-block rounded-chip bg-violet/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet">
                {result.route}
              </span>
            )}
            <p className="whitespace-pre-wrap text-foreground/90">
              {result.answer ?? "No generated answer — showing matched sources."}
            </p>
            {result.sources?.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-white/10 pt-2 text-xs text-muted-foreground">
                {result.sources.slice(0, 5).map((s, i) => (
                  <li key={i} className="truncate">
                    [{i + 1}] {s.title ?? s.snippet}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
          No matches. Press Enter to ask your Brain.
        </Command.Empty>

        <Command.Group heading="Navigate" className="px-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Command.Item
              key={href}
              value={label}
              onSelect={() => go(href)}
              className="flex cursor-pointer items-center gap-3 rounded-panel px-3 py-2 text-sm text-foreground aria-selected:bg-white/[0.06]"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              {label}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
