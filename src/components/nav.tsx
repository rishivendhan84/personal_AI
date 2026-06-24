"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CheckCircle2,
  ListTodo,
  Target,
  Wallet,
  Brain,
  Utensils,
  Hourglass,
  StickyNote,
  Command as CommandIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useFocus } from "@/components/focus/FocusProvider";
import { fmtClock, MODES } from "@/lib/focus";

const links = [
  { href: "/", label: "Operator", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/habits", label: "Habits", icon: CheckCircle2 },
  { href: "/focus", label: "Focus", icon: Hourglass },
  { href: "/nutrition", label: "Nutrition", icon: Utensils },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/brain", label: "Brain", icon: Brain },
];

/** Live countdown chip — shows whenever a focus/break session is in progress. */
function FocusChip() {
  const f = useFocus();
  if (f.phase === "idle") return null;
  const accent = f.phase === "break" ? "#34D399" : MODES[f.mode].accent;
  return (
    <Link
      href="/focus"
      aria-label="Focus session in progress"
      className="flex shrink-0 items-center gap-1.5 rounded-chip border border-foreground/10 bg-foreground/[0.03] px-2 py-1.5 transition-colors hover:bg-foreground/[0.06]"
    >
      <Hourglass
        className={cn("h-3.5 w-3.5", f.running && "animate-pulse")}
        style={{ color: accent }}
      />
      <span className="font-mono text-xs tabular-nums text-foreground">
        {fmtClock(f.remainingMs)}
      </span>
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-30 border-b border-foreground/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full items-center gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link href="/" className="mr-1 flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-chip bg-gradient-to-br from-violet to-cyan text-[11px] font-bold text-white shadow-glow-violet">
            R
          </span>
          <span className="hidden whitespace-nowrap bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent sm:inline">
            Rishi&apos;s Personal Assistant
          </span>
        </Link>

        <div className="flex flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-chip px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-violet")} />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </div>

        <FocusChip />
        <button
          onClick={() => window.dispatchEvent(new Event("paios:cmdk"))}
          className="hidden items-center gap-2 rounded-chip border border-foreground/10 bg-foreground/[0.03] px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground sm:flex"
          aria-label="Open command palette"
        >
          <CommandIcon className="h-3.5 w-3.5" />
          <span>Search</span>
          <kbd className="rounded bg-foreground/5 px-1 py-0.5 text-[10px]">Ctrl K</kbd>
        </button>
        <ThemeToggle />
      </div>
    </nav>
  );
}
