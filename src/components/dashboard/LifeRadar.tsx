"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Radar } from "lucide-react";
import { BentoCard, BentoHeader } from "@/components/ui/bento-card";
import { useReducedMotion, DUR } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface RadarDatum {
  label: string;
  value: number; // 0..100
}

const VIOLET = "#7C5CFC";
const CYAN = "#22D3EE";

// SVG geometry. The chart sits in a square; padding leaves room for labels.
const SIZE = 240; // chart diameter region (center-to-edge = SIZE/2)
const PAD = 56; // breathing room around the chart for axis labels
const VIEW = SIZE + PAD * 2;
const CENTER = VIEW / 2;
const MAX_R = SIZE / 2;
const RINGS = [0.25, 0.5, 0.75, 1] as const;

function clamp(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

/** Vertex position for axis `i` of `n` at a given radius (first axis points up). */
function pointAt(i: number, n: number, radius: number): { x: number; y: number } {
  const angle = (-90 + (i * 360) / n) * (Math.PI / 180);
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function polygonPoints(n: number, radii: number[]): string {
  return radii
    .map((r, i) => {
      const p = pointAt(i, n, r);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(" ");
}

/** Bare radar chart + legend (no card chrome) — embeddable anywhere. */
export function RadarChart({ data }: { data: RadarDatum[] }): React.JSX.Element {
  const reduced = useReducedMotion();
  const n = data.length;

  if (n < 3) {
    return (
      <p className="text-sm text-muted-foreground">
        Add at least 3 dimensions to render the radar.
      </p>
    );
  }

  const values = data.map((d) => clamp(d.value));
  const dataRadii = values.map((v) => (v / 100) * MAX_R);
  const dataPoints = polygonPoints(n, dataRadii);

  return (
    <div>
      <div className="mx-auto w-full max-w-[360px]">
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="h-auto w-full"
          role="img"
          aria-label="Life radar chart"
        >
          {/* Concentric grid polygons (25/50/75/100%) */}
          <g className="text-foreground/15" stroke="currentColor" fill="none">
            {RINGS.map((ring) => (
              <polygon
                key={ring}
                points={polygonPoints(
                  n,
                  Array.from({ length: n }, () => ring * MAX_R)
                )}
                strokeWidth={1}
              />
            ))}
          </g>

          {/* Axis spokes (fainter) */}
          <g className="text-foreground/10" stroke="currentColor">
            {data.map((_, i) => {
              const p = pointAt(i, n, MAX_R);
              return (
                <line
                  key={i}
                  x1={CENTER}
                  y1={CENTER}
                  x2={p.x}
                  y2={p.y}
                  strokeWidth={1}
                />
              );
            })}
          </g>

          {/* Data polygon — animates scale from center on mount */}
          <motion.polygon
            points={dataPoints}
            fill={VIOLET}
            fillOpacity={0.18}
            stroke={VIOLET}
            strokeWidth={2}
            strokeLinejoin="round"
            style={{
              transformBox: "view-box",
              transformOrigin: `${CENTER}px ${CENTER}px`,
            }}
            initial={reduced ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: DUR.slow, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Data vertex dots (cyan) */}
          <g>
            {dataRadii.map((r, i) => {
              const p = pointAt(i, n, r);
              return (
                <motion.circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={3.5}
                  fill={CYAN}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: DUR.base, delay: reduced ? 0 : 0.18 }}
                />
              );
            })}
          </g>

          {/* Axis labels just outside each vertex */}
          <g className="fill-current text-muted-foreground">
            {data.map((d, i) => {
              const p = pointAt(i, n, MAX_R + 18);
              // dx tolerance avoids flipping anchor for near-vertical axes
              const dx = p.x - CENTER;
              const anchor =
                Math.abs(dx) < 4 ? "middle" : dx > 0 ? "start" : "end";
              return (
                <text
                  key={i}
                  x={p.x}
                  y={p.y}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  fontSize={11}
                >
                  <tspan>{d.label} </tspan>
                  <tspan className="font-mono tabular-nums">
                    {clamp(d.value)}
                  </tspan>
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {data.map((d, i) => (
          <li
            key={i}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: i % 2 === 0 ? VIOLET : CYAN }}
              aria-hidden
            />
            <span className="truncate">{d.label}</span>
            <span
              className={cn(
                "ml-auto font-mono tabular-nums text-foreground/80"
              )}
            >
              {clamp(d.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Card-wrapped radar (kept for standalone use). */
export function LifeRadar({ data }: { data: RadarDatum[] }): React.JSX.Element {
  return (
    <BentoCard>
      <BentoHeader icon={Radar} title="Life Radar" />
      <RadarChart data={data} />
    </BentoCard>
  );
}
