"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { MODES, type FocusMode, type FocusPhase } from "@/lib/focus";

/**
 * Global focus-timer engine. Mounted once in the layout so a running session
 * survives client-side navigation. Wall-clock anchored (endsAt) so it stays
 * accurate even when the tab is throttled, and persisted to localStorage so a
 * refresh resumes it. Auto-advances focus → break, chimes + notifies on each
 * phase change, and logs completed focus phases to /api/focus.
 */

interface FocusState {
  mode: FocusMode;
  phase: FocusPhase;
  running: boolean;
  endsAt: number | null; // epoch ms when the current phase ends
  remainingMs: number;
  taskTitle: string | null;
}

interface FocusApi extends FocusState {
  totalMs: number;
  progress: number; // 0..1 within the current phase
  start: (mode?: FocusMode, taskTitle?: string | null) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  setMode: (mode: FocusMode) => void;
  setTask: (title: string | null) => void;
}

const STORAGE_KEY = "paios.focus.v1";
const FocusContext = React.createContext<FocusApi | null>(null);

const phaseMs = (mode: FocusMode, phase: FocusPhase) =>
  (phase === "break" ? MODES[mode].breakMin : MODES[mode].focusMin) * 60_000;

function loadInitial(): FocusState {
  const fallback: FocusState = {
    mode: "quick",
    phase: "idle",
    running: false,
    endsAt: null,
    remainingMs: MODES.quick.focusMin * 60_000,
    taskTitle: null,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const s = JSON.parse(raw) as FocusState;
    if (s.running && s.endsAt) {
      const remaining = s.endsAt - Date.now();
      // Expired while away → settle without double-logging.
      if (remaining <= 0) {
        if (s.phase === "focus")
          return { ...s, phase: "break", running: false, endsAt: null, remainingMs: phaseMs(s.mode, "break") };
        return { ...s, phase: "idle", running: false, endsAt: null, remainingMs: phaseMs(s.mode, "focus") };
      }
      return { ...s, remainingMs: remaining };
    }
    return { ...s, running: false, endsAt: null };
  } catch {
    return fallback;
  }
}

// --- effects (sound + notifications) -------------------------------------
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new Ctx();
    const now = ac.currentTime;
    [880, 1320].forEach((freq, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = freq;
      o.type = "sine";
      o.connect(g);
      g.connect(ac.destination);
      const t = now + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.start(t);
      o.stop(t + 0.45);
    });
    setTimeout(() => ac.close().catch(() => {}), 1200);
  } catch {
    /* audio not allowed — no-op */
  }
}

function notify(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, silent: true });
    }
  } catch {
    /* ignore */
  }
}

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = React.useState<FocusState>(loadInitial);
  const stateRef = React.useRef(state);
  stateRef.current = state;

  // Persist on every change.
  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const handlePhaseEnd = React.useCallback(() => {
    const s = stateRef.current;
    chime();
    if (s.phase === "focus") {
      // Log the completed focus block (best-effort; degrades if table missing).
      // If logging auto-completes the Deep Work habit, refresh so the tick shows.
      void fetch("/api/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: s.mode,
          minutes: MODES[s.mode].focusMin,
          task_title: s.taskTitle,
        }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (j?.data?.autoCompletedDeepWork) router.refresh();
        })
        .catch(() => {});
      notify("Focus complete 🎯", `Nice — take a ${MODES[s.mode].breakMin} min break.`);
      const breakLen = phaseMs(s.mode, "break");
      setState({ ...s, phase: "break", running: true, endsAt: Date.now() + breakLen, remainingMs: breakLen });
    } else {
      notify("Break over", "Ready for another focus block?");
      setState({
        ...s,
        phase: "idle",
        running: false,
        endsAt: null,
        remainingMs: phaseMs(s.mode, "focus"),
      });
    }
  }, [router]);

  // Tick loop (250ms → smooth hourglass + second display).
  React.useEffect(() => {
    if (!state.running || !state.endsAt) return;
    const id = setInterval(() => {
      const remaining = (stateRef.current.endsAt ?? 0) - Date.now();
      if (remaining <= 0) handlePhaseEnd();
      else setState((s) => ({ ...s, remainingMs: remaining }));
    }, 250);
    return () => clearInterval(id);
  }, [state.running, state.endsAt, handlePhaseEnd]);

  const requestNotify = () => {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    } catch {
      /* ignore */
    }
  };

  const start: FocusApi["start"] = (mode, taskTitle) => {
    requestNotify();
    setState((s) => {
      const m = mode ?? s.mode;
      const len = phaseMs(m, "focus");
      return {
        mode: m,
        phase: "focus",
        running: true,
        endsAt: Date.now() + len,
        remainingMs: len,
        taskTitle: taskTitle !== undefined ? taskTitle : s.taskTitle,
      };
    });
  };

  const pause = () =>
    setState((s) =>
      s.running && s.endsAt
        ? { ...s, running: false, endsAt: null, remainingMs: Math.max(0, s.endsAt - Date.now()) }
        : s
    );

  const resume = () =>
    setState((s) =>
      !s.running && s.phase !== "idle" && s.remainingMs > 0
        ? { ...s, running: true, endsAt: Date.now() + s.remainingMs }
        : s
    );

  const reset = () =>
    setState((s) => ({
      ...s,
      phase: "idle",
      running: false,
      endsAt: null,
      remainingMs: phaseMs(s.mode, "focus"),
    }));

  const skip = () => {
    if (stateRef.current.phase === "idle") return;
    handlePhaseEnd();
  };

  const setMode: FocusApi["setMode"] = (mode) =>
    setState((s) =>
      s.phase === "idle"
        ? { ...s, mode, remainingMs: phaseMs(mode, "focus") }
        : { ...s, mode }
    );

  const setTask: FocusApi["setTask"] = (title) => setState((s) => ({ ...s, taskTitle: title }));

  const totalMs = phaseMs(state.mode, state.phase === "idle" ? "focus" : state.phase);
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, 1 - state.remainingMs / totalMs)) : 0;

  const value: FocusApi = {
    ...state,
    totalMs,
    progress,
    start,
    pause,
    resume,
    reset,
    skip,
    setMode,
    setTask,
  };

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus(): FocusApi {
  const ctx = React.useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used within <FocusProvider>");
  return ctx;
}
