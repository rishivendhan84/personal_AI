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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/", label: "Operator", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/habits", label: "Habits", icon: CheckCircle2 },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/brain", label: "Brain", icon: Brain },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-30 flex items-center gap-1 border-b border-border bg-background/80 px-3 py-2 backdrop-blur">
      <Link href="/" className="mr-2 flex items-center gap-2 font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-xs">
          AI
        </span>
        <span className="hidden sm:inline">PAIOS</span>
      </Link>
      <div className="flex flex-1 items-center gap-0.5 overflow-x-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-secondary text-secondary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </div>
      <ThemeToggle />
    </nav>
  );
}
