"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const TAGS = [
  { value: "task",             label: "Task",            emoji: "✅", color: "bg-teal-900/30 border-teal-700/40 text-teal-400" },
  { value: "feature",          label: "Feature",         emoji: "✨", color: "bg-blue-900/30 border-blue-700/40 text-blue-400" },
  { value: "sport_suggestion", label: "Sport Idea",      emoji: "🏅", color: "bg-pink-900/30 border-pink-700/40 text-pink-400" },
  { value: "bug",              label: "Bug",             emoji: "🐛", color: "bg-red-900/30 border-red-700/40 text-red-400" },
  { value: "discussion",       label: "Discussion",      emoji: "💬", color: "bg-yellow-900/30 border-yellow-700/40 text-yellow-400" },
  { value: "announcement",     label: "Announcement",    emoji: "📢", color: "bg-purple-900/30 border-purple-700/40 text-purple-400" },
];

function tagMeta(tag: string) {
  return TAGS.find((t) => t.value === tag) ?? TAGS[4];
}

interface Note {
  id: string;
  content: string;
  tag: string;
  pinned: boolean;
  resolved: boolean;
  resolved_at?: string;
  created_at: string;
  author_id: string;
  profiles?: { username: string; first_name: string; role?: string; super_admin?: boolean } | { username: string; first_name: string; role?: string; super_admin?: boolean }[];
}

interface CurrentUser {
  id: string;
  username: string;
  firstName: string;
  role: string;
  superAdmin: boolean;
}

export function NotesBoard({
  initialNotes,
  initialResolved,
  currentUser,
}: {
  initialNotes: Note[];
  initialResolved: Note[];
  currentUser: CurrentUser;
}) {
  const [notes, setNotes]           = useState<Note[]>(initialNotes);
  const [resolved, setResolved]     = useState<Note[]>(initialResolved);
  const [content, setContent]       = useState("");
  const [tag, setTag]               = useState("task");
  const [adding, setAdding]         = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [filterTag, setFilterTag]   = useState("all");
  const textRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin_notes_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notes" }, async (payload) => {
        // Fetch with author info
        const { data } = await supabase
          .from("admin_notes")
          .select("id, content, tag, pinned, resolved, created_at, author_id, profiles!admin_notes_author_id_fkey(username, first_name, role, super_admin)")
          .eq("id", payload.new.id)
          .single();
        if (data && !data.resolved) {
          setNotes((prev) => {
            if (prev.find((n) => n.id === data.id)) return prev;
            const next = [data as Note, ...prev];
            return next.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "admin_notes" }, (payload) => {
        const updated = payload.new as Note;
        if (updated.resolved) {
          setNotes((prev) => prev.filter((n) => n.id !== updated.id));
          setResolved((prev) => [{ ...updated }, ...prev].slice(0, 20));
        } else {
          setNotes((prev) =>
            prev.map((n) => n.id === updated.id ? { ...n, ...updated } : n)
              .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
          );
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "admin_notes" }, (payload) => {
        setNotes((prev) => prev.filter((n) => n.id !== payload.old.id));
        setResolved((prev) => prev.filter((n) => n.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function addNote() {
    if (!content.trim()) return;
    setAdding(true);
    await supabase.from("admin_notes").insert({
      author_id: currentUser.id,
      content: content.trim(),
      tag,
    });
    setContent("");
    setAdding(false);
    textRef.current?.focus();
  }

  async function togglePin(note: Note) {
    await supabase.from("admin_notes").update({ pinned: !note.pinned }).eq("id", note.id);
  }

  async function markResolved(noteId: string) {
    await supabase.from("admin_notes").update({
      resolved: true,
      resolved_by: currentUser.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", noteId);
  }

  async function deleteNote(noteId: string) {
    await supabase.from("admin_notes").delete().eq("id", noteId);
  }

  function canModify(note: Note) {
    return currentUser.superAdmin || note.author_id === currentUser.id;
  }

  const filtered = filterTag === "all" ? notes : notes.filter((n) => n.tag === filterTag);
  const pinned   = filtered.filter((n) => n.pinned);
  const unpinned = filtered.filter((n) => !n.pinned);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black">📋 Collaboration Board</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Shared notes for the admin team. Real-time — updates appear instantly for everyone.
        </p>
      </div>

      {/* Add note */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
        <div className="flex gap-1.5 flex-wrap">
          {TAGS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTag(t.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                tag === t.value ? t.color : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
        <textarea
          ref={textRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }}
          placeholder="Add a note, task, feature idea, sport suggestion… (Cmd+Enter to post)"
          rows={3}
          className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-teal-600/60 resize-none"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--muted)]">Posting as <span className="text-[var(--foreground)]">@{currentUser.username}</span> {currentUser.superAdmin ? "👑" : ""}</p>
          <button
            type="button"
            onClick={addNote}
            disabled={adding || !content.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-pink-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
          >
            {adding ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      {/* Filter by tag */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilterTag("all")}
          className={`px-3 py-1.5 rounded-xl text-xs border transition-colors cursor-pointer ${filterTag === "all" ? "bg-[var(--surface-2)] border-teal-500 text-teal-300" : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]"}`}
        >
          All ({notes.length})
        </button>
        {TAGS.map((t) => {
          const count = notes.filter((n) => n.tag === t.value).length;
          if (count === 0) return null;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilterTag(t.value)}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-colors cursor-pointer ${filterTag === t.value ? t.color : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]"}`}
            >
              {t.emoji} {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Pinned notes */}
      {pinned.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">📌 Pinned</p>
          {pinned.map((note) => <NoteCard key={note.id} note={note} canModify={canModify(note)} onPin={togglePin} onResolve={markResolved} onDelete={deleteNote} />)}
        </div>
      )}

      {/* Active notes */}
      <div className="space-y-2">
        {pinned.length > 0 && unpinned.length > 0 && (
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Active</p>
        )}
        {unpinned.length === 0 && pinned.length === 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--muted)]">
            No notes yet. Add the first one above.
          </div>
        )}
        {unpinned.map((note) => <NoteCard key={note.id} note={note} canModify={canModify(note)} onPin={togglePin} onResolve={markResolved} onDelete={deleteNote} />)}
      </div>

      {/* Resolved / history */}
      <div>
        <button
          type="button"
          onClick={() => setShowResolved((v) => !v)}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer flex items-center gap-1"
        >
          {showResolved ? "▾" : "▸"} Completed ({resolved.length})
        </button>
        {showResolved && (
          <div className="mt-2 space-y-2">
            {resolved.length === 0 && <p className="text-sm text-[var(--muted)] pl-4">Nothing completed yet.</p>}
            {resolved.map((note) => (
              <div key={note.id} className="flex items-start gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 opacity-60">
                <span className="text-base mt-0.5 shrink-0">{tagMeta(note.tag).emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--muted)] line-through">{note.content}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    @{(note.profiles as any)?.first_name ?? "—"} · done {note.resolved_at ? new Date(note.resolved_at).toLocaleDateString() : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteNote(note.id)}
                  className="text-xs text-[var(--muted)] hover:text-red-400 transition-colors cursor-pointer shrink-0"
                  title="Delete permanently"
                >🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({
  note,
  canModify,
  onPin,
  onResolve,
  onDelete,
}: {
  note: Note;
  canModify: boolean;
  onPin: (note: Note) => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const meta     = tagMeta(note.tag);
  const author   = note.profiles as any;
  const isSuper  = author?.super_admin;
  const timeAgo  = (() => {
    const diff = Date.now() - new Date(note.created_at).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();

  return (
    <div className={`bg-[var(--surface)] border rounded-xl px-4 py-3 space-y-2 ${note.pinned ? "border-yellow-700/40" : "border-[var(--border)]"}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5 shrink-0">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{note.content}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
            <span className="text-xs text-[var(--muted)]">
              {isSuper ? "👑 " : ""}{author?.first_name ?? "—"} · {timeAgo}
            </span>
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onPin(note)}
            className={`text-sm px-1.5 py-1 rounded-lg transition-colors cursor-pointer ${note.pinned ? "text-yellow-400 hover:text-yellow-300" : "text-[var(--muted)] hover:text-yellow-400"}`}
            title={note.pinned ? "Unpin" : "Pin"}
          >📌</button>
          <button
            type="button"
            onClick={() => onResolve(note.id)}
            className="text-sm px-1.5 py-1 rounded-lg text-[var(--muted)] hover:text-teal-400 transition-colors cursor-pointer"
            title="Mark done"
          >✓</button>
          {canModify && (
            <button
              type="button"
              onClick={() => onDelete(note.id)}
              className="text-sm px-1.5 py-1 rounded-lg text-[var(--muted)] hover:text-red-400 transition-colors cursor-pointer"
              title="Delete"
            >🗑</button>
          )}
        </div>
      </div>
    </div>
  );
}
