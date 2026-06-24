"use client";
import * as React from "react";
import { Upload, Loader2, Check, X } from "lucide-react";
import type { NoteChecklistItem } from "@/lib/db/types";

/** Map a Keep Takeout color (e.g. "CERULEAN") to our palette keys. */
function mapColor(raw?: string): string {
  switch ((raw ?? "").toUpperCase()) {
    case "RED":
      return "red";
    case "ORANGE":
      return "orange";
    case "YELLOW":
      return "yellow";
    case "GREEN":
      return "green";
    case "TEAL":
      return "teal";
    case "BLUE":
    case "CERULEAN":
    case "DARKBLUE":
      return "blue";
    case "PURPLE":
      return "purple";
    case "PINK":
      return "pink";
    case "BROWN":
      return "orange";
    case "GRAY":
    case "GREY":
      return "gray";
    default:
      return "default";
  }
}

const usecToIso = (usec?: number): string | undefined =>
  typeof usec === "number" && usec > 0 ? new Date(Math.round(usec / 1000)).toISOString() : undefined;

interface KeepJson {
  title?: string;
  textContent?: string;
  listContent?: { text?: string; isChecked?: boolean }[];
  color?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  labels?: { name?: string }[];
  createdTimestampUsec?: number;
  userEditedTimestampUsec?: number;
}

interface ImportNote {
  title: string | null;
  body: string | null;
  checklist: NoteChecklistItem[] | null;
  color: string;
  pinned: boolean;
  archived: boolean;
  labels: string[];
  keep_id: string;
  created_at?: string;
  updated_at?: string;
}

function parseKeep(j: KeepJson, fallbackId: string): ImportNote | null {
  if (j.isTrashed) return null;
  const checklist: NoteChecklistItem[] | null = Array.isArray(j.listContent)
    ? j.listContent.map((it) => ({ text: it.text ?? "", checked: !!it.isChecked }))
    : null;
  const keep_id = String(j.createdTimestampUsec ?? j.userEditedTimestampUsec ?? fallbackId);
  return {
    title: j.title?.trim() || null,
    body: typeof j.textContent === "string" ? j.textContent : null,
    checklist: checklist && checklist.length ? checklist : null,
    color: mapColor(j.color),
    pinned: !!j.isPinned,
    archived: !!j.isArchived,
    labels: Array.isArray(j.labels) ? j.labels.map((l) => l.name ?? "").filter(Boolean) : [],
    keep_id,
    created_at: usecToIso(j.createdTimestampUsec),
    updated_at: usecToIso(j.userEditedTimestampUsec ?? j.createdTimestampUsec),
  };
}

/**
 * Google Keep importer. Reads the per-note `.json` files from a Takeout export
 * (takeout.google.com → Keep), parses them in the browser, and posts them to
 * /api/notes/import. Accepts a whole folder or a multi-file selection.
 */
export function ImportKeep({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const jsonFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".json"));
      const notes: ImportNote[] = [];
      for (let i = 0; i < jsonFiles.length; i++) {
        try {
          const text = await jsonFiles[i].text();
          const parsed = parseKeep(JSON.parse(text) as KeepJson, `${jsonFiles[i].name}-${i}`);
          if (parsed) notes.push(parsed);
        } catch {
          // Skip non-Keep / malformed JSON files silently.
        }
      }
      if (notes.length === 0) {
        setMsg("No Keep notes found in that selection.");
        return;
      }
      const res = await fetch("/api/notes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error ?? "import failed");
      setMsg(`Imported ${json.data?.imported ?? notes.length} notes.`);
      onImported();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-chip border border-border bg-accent/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/70"
      >
        <Upload className="h-3.5 w-3.5 text-violet" />
        Import from Keep
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-panel border border-border bg-card p-4 text-left shadow-2xl ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Import Google Keep</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-chip p-1 text-muted-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="mb-3 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            <li>
              Go to{" "}
              <a
                href="https://takeout.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet hover:underline"
              >
                takeout.google.com
              </a>
              , select only <span className="text-foreground">Keep</span>, and export.
            </li>
            <li>Unzip it. You&apos;ll get a <span className="text-foreground">Takeout/Keep</span> folder of .json files.</li>
            <li>Select that folder (or all the .json files) below.</li>
          </ol>

          {/* webkitdirectory lets the user pick the whole Keep folder at once. */}
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            multiple
            // @ts-expect-error non-standard but widely supported folder picker
            webkitdirectory=""
            onChange={(e) => void handleFiles(e.target.files)}
            disabled={busy}
            className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-chip file:border-0 file:bg-violet/15 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-violet/25"
          />

          {busy && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…
            </p>
          )}
          {msg && !busy && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-foreground">
              <Check className="h-3.5 w-3.5 text-positive" /> {msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
