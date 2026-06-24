"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pin,
  PinOff,
  Palette,
  Archive,
  ArchiveRestore,
  Trash2,
  Search,
  Plus,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page";
import { Input, Textarea } from "@/components/ui/input";
import { ImportKeep } from "@/components/notes/ImportKeep";
import { cn } from "@/lib/utils";
import { bentoContainer, bentoItem } from "@/lib/motion";
import type { Note, NoteChecklistItem } from "@/lib/db/types";

/** Palette (dark-friendly tints). `default` falls back to the glass surface. */
const COLORS: { key: string; hex: string | null }[] = [
  { key: "default", hex: null },
  { key: "red", hex: "#F87171" },
  { key: "orange", hex: "#FB923C" },
  { key: "yellow", hex: "#FBBF24" },
  { key: "green", hex: "#34D399" },
  { key: "teal", hex: "#2DD4BF" },
  { key: "blue", hex: "#60A5FA" },
  { key: "purple", hex: "#A78BFA" },
  { key: "pink", hex: "#F472B6" },
  { key: "gray", hex: "#9CA3AF" },
];

function colorStyle(color: string): React.CSSProperties | undefined {
  const c = COLORS.find((x) => x.key === color);
  if (!c?.hex) return undefined;
  return { backgroundColor: `${c.hex}1A`, borderColor: `${c.hex}40` };
}

export function NotesBoard({ initial }: { initial: Note[] }) {
  const router = useRouter();
  const [notes, setNotes] = React.useState<Note[]>(initial);
  const [query, setQuery] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);

  const refetch = React.useCallback(async (archived: boolean) => {
    try {
      const res = await fetch(`/api/notes${archived ? "?archived=1" : ""}`, { cache: "no-store" });
      const json = await res.json();
      if (json?.ok && Array.isArray(json.data?.notes)) setNotes(json.data.notes as Note[]);
    } catch {
      /* keep current state */
    }
  }, []);

  React.useEffect(() => {
    void refetch(showArchived);
  }, [showArchived, refetch]);

  const patch = React.useCallback(async (id: string, body: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...body } : n)));
    try {
      await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      /* optimistic; next refetch reconciles */
    }
  }, []);

  const remove = React.useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
    } catch {
      /* ignore */
    }
  }, []);

  // Archive/unarchive removes the card from the current view.
  const setArchived = React.useCallback(
    async (id: string, archived: boolean) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      try {
        await fetch(`/api/notes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived }),
        });
      } catch {
        /* ignore */
      }
    },
    []
  );

  const create = React.useCallback(
    async (title: string, body: string, color: string) => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, color }),
      });
      const json = await res.json();
      if (json?.ok && json.data?.note) {
        const note = json.data.note as Note;
        if (!showArchived) setNotes((prev) => [note, ...prev]);
      }
      router.refresh();
    },
    [router, showArchived]
  );

  const q = query.trim().toLowerCase();
  const visible = q
    ? notes.filter(
        (n) =>
          (n.title ?? "").toLowerCase().includes(q) ||
          (n.body ?? "").toLowerCase().includes(q) ||
          n.labels.some((l) => l.toLowerCase().includes(q)) ||
          (n.checklist ?? []).some((c) => c.text.toLowerCase().includes(q))
      )
    : notes;

  return (
    <>
      <PageHeader
        title="Notes"
        description="A Keep-style board — import your Google Keep notes via Takeout."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-chip border px-3 py-1.5 text-xs font-medium transition-colors",
                showArchived
                  ? "border-violet/40 bg-violet/15 text-foreground"
                  : "border-border bg-accent/40 text-muted-foreground hover:bg-accent/70"
              )}
            >
              <Archive className="h-3.5 w-3.5" />
              {showArchived ? "Archived" : "Active"}
            </button>
            <ImportKeep onImported={() => void refetch(showArchived)} />
          </div>
        }
      />

      {!showArchived && <Composer onCreate={create} />}

      <div className="mb-4 flex items-center gap-2 rounded-chip border border-foreground/10 bg-foreground/[0.03] px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes…"
          className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={showArchived ? "No archived notes" : "No notes yet"}
          hint={
            showArchived
              ? "Archived notes will appear here."
              : "Take a note above, or import your Google Keep notes with the button up top."
          }
        />
      ) : (
        <motion.div
          variants={bentoContainer}
          initial="hidden"
          animate="show"
          className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid"
        >
          <AnimatePresence initial={false}>
            {visible.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onPatch={patch}
                onDelete={remove}
                onArchive={setArchived}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}

/** "Take a note…" composer that expands into title + body fields. */
function Composer({ onCreate }: { onCreate: (title: string, body: string, color: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [color, setColor] = React.useState("default");

  function save() {
    if (title.trim() || body.trim()) onCreate(title.trim(), body.trim(), color);
    setTitle("");
    setBody("");
    setColor("default");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full max-w-xl items-center gap-2 rounded-panel border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.06]"
      >
        <Plus className="h-4 w-4 text-violet" />
        Take a note…
      </button>
    );
  }

  return (
    <div
      className="mb-4 max-w-xl rounded-panel border p-3 shadow-card"
      style={colorStyle(color) ?? { borderColor: "rgba(255,255,255,0.08)" }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="mb-2 h-8 border-0 bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-0"
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Take a note…"
        className="min-h-[64px] border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
        }}
      />
      <div className="mt-2 flex items-center justify-between">
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-chip px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-foreground/[0.06]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-chip border border-violet/40 bg-violet/15 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-violet/25"
          >
            Add note
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Note color"
        className="rounded-chip p-1.5 text-muted-foreground/80 transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
      >
        <Palette className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute bottom-9 left-0 z-20 flex flex-wrap gap-1.5 rounded-panel border border-border bg-card p-2 shadow-2xl ring-1 ring-black/5">
          {COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                onChange(c.key);
                setOpen(false);
              }}
              aria-label={c.key}
              className={cn(
                "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                value === c.key ? "ring-2 ring-violet ring-offset-1 ring-offset-background" : ""
              )}
              style={
                c.hex
                  ? { backgroundColor: `${c.hex}33`, borderColor: `${c.hex}80` }
                  : { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.15)" }
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  onPatch,
  onDelete,
  onArchive,
}: {
  note: Note;
  onPatch: (id: string, body: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string, archived: boolean) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(note.title ?? "");
  const [body, setBody] = React.useState(note.body ?? "");

  function commit() {
    setEditing(false);
    if ((title.trim() || null) !== note.title || (body.trim() || null) !== note.body) {
      onPatch(note.id, { title: title.trim() || null, body: body.trim() || null });
    }
  }

  function toggleCheck(i: number) {
    const next: NoteChecklistItem[] = (note.checklist ?? []).map((c, idx) =>
      idx === i ? { ...c, checked: !c.checked } : c
    );
    onPatch(note.id, { checklist: next });
  }

  return (
    <motion.div
      layout
      variants={bentoItem}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="group relative rounded-card border p-4 shadow-card transition-shadow hover:shadow-glow-violet"
      style={colorStyle(note.color) ?? { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
    >
      {/* Pin (top-right, always visible when pinned) */}
      <button
        type="button"
        onClick={() => onPatch(note.id, { pinned: !note.pinned })}
        aria-label={note.pinned ? "Unpin" : "Pin"}
        className={cn(
          "absolute right-2 top-2 rounded-chip p-1.5 transition-colors hover:bg-foreground/[0.08]",
          note.pinned ? "text-violet" : "text-muted-foreground/60 opacity-0 group-hover:opacity-100"
        )}
      >
        {note.pinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <PinOff className="h-3.5 w-3.5" />}
      </button>

      {editing ? (
        <>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="mb-1.5 h-7 border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={commit}
            placeholder="Note…"
            className="min-h-[80px] border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={commit}
            className="mt-1 rounded-chip border border-violet/40 bg-violet/15 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-violet/25"
          >
            Done
          </button>
        </>
      ) : (
        <div className="cursor-text pr-6" onClick={() => setEditing(true)}>
          {note.title && <h3 className="mb-1 break-words text-sm font-semibold">{note.title}</h3>}
          {note.checklist && note.checklist.length > 0 ? (
            <ul className="space-y-1">
              {note.checklist.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={c.checked}
                    onChange={() => toggleCheck(i)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-violet"
                  />
                  <span className={cn("break-words", c.checked && "text-muted-foreground line-through")}>
                    {c.text}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            note.body && (
              <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{note.body}</p>
            )
          )}
          {note.labels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {note.labels.map((l) => (
                <span
                  key={l}
                  className="rounded-chip border border-foreground/10 bg-foreground/[0.04] px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Controls — revealed on hover */}
      <div className="mt-3 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <InlineColor value={note.color} onChange={(c) => onPatch(note.id, { color: c })} />
        <button
          type="button"
          onClick={() => onArchive(note.id, !note.archived)}
          aria-label={note.archived ? "Unarchive" : "Archive"}
          className="rounded-chip p-1.5 text-muted-foreground/70 transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
        >
          {note.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Delete this note?")) onDelete(note.id);
          }}
          aria-label="Delete"
          className="rounded-chip p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger/15 hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/** Compact color swatch popover for a saved note. */
function InlineColor({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change color"
        className="rounded-chip p-1.5 text-muted-foreground/70 transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
      >
        <Palette className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-9 left-0 z-20 flex w-40 flex-wrap gap-1.5 rounded-panel border border-border bg-card p-2 shadow-2xl ring-1 ring-black/5">
          {COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                onChange(c.key);
                setOpen(false);
              }}
              aria-label={c.key}
              className={cn(
                "h-5 w-5 rounded-full border transition-transform hover:scale-110",
                value === c.key ? "ring-2 ring-violet" : ""
              )}
              style={
                c.hex
                  ? { backgroundColor: `${c.hex}33`, borderColor: `${c.hex}80` }
                  : { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.15)" }
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
