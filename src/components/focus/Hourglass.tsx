"use client";
import * as React from "react";
import { fmtClock } from "@/lib/focus";

/**
 * Animated SVG hourglass. Top bulb drains and the bottom fills as `progress`
 * goes 0→1; a sand stream falls through the neck while running. The remaining
 * time is shown in the centre (mono, tabular). Pure presentational + GPU-cheap.
 */
export function Hourglass({
  progress,
  remainingMs,
  accent,
  running,
  label,
}: {
  progress: number; // 0..1
  remainingMs: number;
  accent: string;
  running: boolean;
  label?: string;
}) {
  const p = Math.min(1, Math.max(0, progress));

  // Geometry (viewBox 120×196). Neck at y=98.
  const TOP_Y = 24;
  const NECK_Y = 98;
  const BOT_Y = 172;

  const topSurfaceY = TOP_Y + (NECK_Y - TOP_Y) * p; // drops toward neck
  const botSurfaceY = BOT_Y - (BOT_Y - NECK_Y) * p; // rises from base

  const topTri = `${27},${TOP_Y} ${93},${TOP_Y} ${60},${NECK_Y}`;
  const botTri = `${60},${NECK_Y} ${27},${BOT_Y} ${93},${BOT_Y}`;
  const trans = "y 250ms linear, height 250ms linear";

  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 120 200" className="h-64 w-64 sm:h-72 sm:w-72" role="img" aria-label="Focus hourglass">
        <defs>
          <clipPath id="hg-top">
            <polygon points={topTri} />
          </clipPath>
          <clipPath id="hg-bot">
            <polygon points={botTri} />
          </clipPath>
          <linearGradient id="hg-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.65" />
          </linearGradient>
        </defs>

        {/* glass bulbs */}
        <polygon points={topTri} fill={accent} fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
        <polygon points={botTri} fill={accent} fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />

        {/* sand — top (draining) */}
        <rect
          x="20"
          y={topSurfaceY}
          width="80"
          height={Math.max(0, NECK_Y - topSurfaceY)}
          fill="url(#hg-sand)"
          clipPath="url(#hg-top)"
          style={{ transition: trans }}
        />
        {/* sand — bottom (filling) */}
        <rect
          x="20"
          y={botSurfaceY}
          width="80"
          height={Math.max(0, BOT_Y - botSurfaceY)}
          fill="url(#hg-sand)"
          clipPath="url(#hg-bot)"
          style={{ transition: trans }}
        />
        {/* falling stream */}
        {running && p < 1 && (
          <rect x="58.5" y={NECK_Y - 2} width="3" height={Math.max(0, botSurfaceY - NECK_Y + 2)} fill={accent} fillOpacity="0.8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="0.6s" repeatCount="indefinite" />
          </rect>
        )}

        {/* caps + frame */}
        <rect x="18" y={TOP_Y - 8} width="84" height="8" rx="3" fill="currentColor" fillOpacity="0.35" />
        <rect x="18" y={BOT_Y} width="84" height="8" rx="3" fill="currentColor" fillOpacity="0.35" />
        <line x1="60" y1={NECK_Y} x2="60" y2={NECK_Y} stroke={accent} strokeWidth="3" />
      </svg>

      {/* centre readout */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-semibold tabular-nums text-foreground sm:text-4xl">
          {fmtClock(remainingMs)}
        </span>
        {label && (
          <span className="mt-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
