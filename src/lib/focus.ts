// Focus / Pomodoro modes (client + server shared). Durations in minutes.

export type FocusMode = "quick" | "deep" | "learning";
export type FocusPhase = "idle" | "focus" | "break";

export interface FocusModeDef {
  label: string;
  focusMin: number;
  breakMin: number;
  blurb: string;
  accent: string; // hex, drives the hourglass sand + ring
}

export const MODES: Record<FocusMode, FocusModeDef> = {
  quick: {
    label: "Quick Focus",
    focusMin: 25,
    breakMin: 5,
    blurb: "Classic Pomodoro — beat procrastination with short sprints.",
    accent: "#7C5CFC",
  },
  deep: {
    label: "Deep Work",
    focusMin: 90,
    breakMin: 15,
    blurb: "Long, distraction-free blocks for hard, high-value work.",
    accent: "#22D3EE",
  },
  learning: {
    label: "Learning Mode",
    focusMin: 45,
    breakMin: 10,
    blurb: "Study sprints sized for retention and review.",
    accent: "#34D399",
  },
};

export const MODE_ORDER: FocusMode[] = ["quick", "deep", "learning"];

/** ms → MM:SS */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
