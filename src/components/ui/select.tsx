"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Dark/light-visible dropdown. The option list renders in a PORTAL on
 * document.body with fixed positioning computed at open time, so it's never
 * clipped by an `overflow-hidden`/transformed ancestor and never a null frame.
 * Opaque `bg-card` + high z-index guarantee visibility. Keyboard + click-out.
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
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [pos, setPos] = React.useState<{
    left: number;
    top: number;
    width: number;
    maxH: number;
  } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLUListElement>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const selected = options.find((o) => o.value === value);

  const place = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const wantH = Math.min(280, options.length * 40 + 10);
    const openUp = spaceBelow < wantH && spaceAbove > spaceBelow;
    const maxH = Math.max(140, (openUp ? spaceAbove : spaceBelow) - 12);
    const h = Math.min(wantH, maxH);
    setPos({
      left: r.left,
      top: openUp ? r.top - h - 6 : r.bottom + 6,
      width: r.width,
      maxH,
    });
  }, [options.length]);

  const openMenu = React.useCallback(() => {
    if (disabled) return;
    place();
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }, [disabled, place, options, value]);

  React.useEffect(() => {
    if (!open) return;
    const reposition = () => place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, place]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openMenu();
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
    open && pos && mounted
      ? createPortal(
          <ul
            ref={panelRef}
            role="listbox"
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top,
              width: pos.width,
              maxHeight: pos.maxH,
              zIndex: 9999,
            }}
            className="overflow-auto rounded-panel border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5 animate-fade-up"
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
                      isActive ? "bg-violet/15 text-foreground" : "text-foreground/90 hover:bg-violet/10"
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-violet" />}
                  </button>
                </li>
              );
            })}
          </ul>,
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
        onClick={() => (open ? setOpen(false) : openMenu())}
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
      {panel}
    </div>
  );
}
