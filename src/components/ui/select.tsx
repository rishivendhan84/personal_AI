"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motion";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Dark-mode-visible dropdown. The option list renders in a PORTAL with fixed
 * positioning so it's never clipped by an `overflow-hidden` ancestor (that bug
 * made the last option unclickable) and flips upward near the viewport edge.
 * Keyboard nav, click-outside, reduced-motion aware.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [pos, setPos] = React.useState<{ left: number; top: number; width: number; up: boolean; maxH: number } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  const place = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const desired = Math.min(260, options.length * 38 + 10);
    const up = spaceBelow < desired && spaceAbove > spaceBelow;
    setPos({
      left: r.left,
      top: up ? r.top : r.bottom,
      width: r.width,
      up,
      maxH: Math.max(140, (up ? spaceAbove : spaceBelow) - 12),
    });
  }, [options.length]);

  // Reposition while open (scroll/resize) and close on outside click.
  React.useEffect(() => {
    if (!open) return;
    place();
    const onScroll = () => place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, place]);

  React.useEffect(() => {
    if (open) {
      const i = options.findIndex((o) => o.value === value);
      setActive(i >= 0 ? i : 0);
    }
  }, [open, value, options]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[active];
      if (opt && !opt.disabled) choose(opt.value);
    }
  };

  const panel =
    open && pos && typeof document !== "undefined"
      ? createPortal(
          <motion.ul
            ref={panelRef}
            role="listbox"
            initial={reduced ? false : { opacity: 0, y: pos.up ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: pos.up ? 4 : -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "fixed",
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxH,
              ...(pos.up
                ? { bottom: window.innerHeight - pos.top + 6 }
                : { top: pos.top + 6 }),
            }}
            className="z-[100] overflow-auto rounded-panel border border-foreground/10 bg-card/95 p-1 shadow-glow-violet backdrop-blur-xl"
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              const isActive = i === active;
              return (
                <li key={o.value || `opt-${i}`} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    disabled={o.disabled}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => !o.disabled && choose(o.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-40",
                      isActive ? "bg-violet/15 text-foreground" : "text-foreground/90",
                      "hover:bg-violet/15"
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-violet" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>,
          document.body
        )
      : null;

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-chip border border-foreground/10 bg-foreground/[0.03] px-3 text-sm outline-none transition-colors hover:bg-foreground/[0.06] focus-visible:border-violet/60 focus-visible:ring-1 focus-visible:ring-violet/40 disabled:cursor-not-allowed disabled:opacity-50",
          selected ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence>{panel}</AnimatePresence>
    </div>
  );
}
