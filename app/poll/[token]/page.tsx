"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

// ─── Time slot constants (match the protected poll page) ─────────────────────
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23;

function generateSlots(): string[] {
  const slots: string[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}
const ALL_SLOTS = generateSlots();

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) { dates.push(cur.toISOString().split("T")[0]); cur.setDate(cur.getDate() + 1); }
  return dates;
}

function shortDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatHour(slot: string) {
  const [h, m] = slot.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${ampm}` : "";
}

// ─── Availability grid (inline, no auth dependency) ──────────────────────────
function AvailabilityGrid({
  token, dates, existingResponses, onSaved,
}: {
  token: string;
  dates: string[];
  existingResponses: Record<string, string[]>;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [selected, setSelected] = useState<Record<string, Set<string>>>(() => {
    const m: Record<string, Set<string>> = {};
    for (const [d, slots] of Object.entries(existingResponses)) m[d] = new Set(slots);
    return m;
  });
  const [activeDate, setActiveDate] = useState(dates[0] ?? "");
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((date: string, slot: string, mode?: "add" | "remove") => {
    setSelected((prev) => {
      const set = new Set(prev[date] ?? []);
      const eff = mode ?? (set.has(slot) ? "remove" : "add");
      if (eff === "add") set.add(slot); else set.delete(slot);
      return { ...prev, [date]: set };
    });
    setSaved(false);
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    const daysToSave = Object.entries(selected);
    for (const [date, slotsSet] of daysToSave) {
      const slots = Array.from(slotsSet).sort();
      const { data, error: fnErr } = await supabase.rpc("submit_poll_response_by_token", {
        p_token: token,
        p_response_date: date,
        p_slots: slots,
      });
      if (fnErr || (data as any)?.error) {
        setError((data as any)?.error ?? fnErr?.message ?? "Error saving");
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setSaved(true);
    onSaved();
  }

  const currentSlots = selected[activeDate] ?? new Set<string>();
  const totalMarked = Object.values(selected).reduce((acc, s) => acc + s.size, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Your Availability</h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">Tap or drag to mark when you&apos;re free.</p>
        </div>
        <Button onClick={save} loading={saving} variant="secondary" size="sm">
          {saved ? "✓ Saved" : saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Day tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {dates.map((d) => {
          const hasSlots = (selected[d]?.size ?? 0) > 0;
          return (
            <button key={d} onClick={() => setActiveDate(d)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                d === activeDate ? "bg-teal-600/30 text-teal-300 border-teal-600/50"
                : hasSlots ? "bg-[var(--surface-2)] text-teal-400 border-teal-600/20"
                : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)] hover:border-teal-600/30"
              }`}
            >
              {shortDate(d)}{hasSlots && " ·"}
            </button>
          );
        })}
      </div>

      {/* Slot grid */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden select-none">
        <div className="grid" style={{ gridTemplateColumns: "44px 1fr" }}>
          {ALL_SLOTS.map((slot) => {
            const isHour = slot.endsWith(":00");
            const isSel = currentSlots.has(slot);
            return [
              <div key={`l-${slot}`} style={{ height: 20 }}
                className={`px-2 flex items-center justify-end text-[10px] text-[var(--muted)] border-r border-[var(--border)] ${isHour ? "border-t border-[var(--border)]" : "border-t border-[var(--surface-2)]"}`}
              >
                {isHour ? formatHour(slot) : ""}
              </div>,
              <div key={`s-${slot}`} style={{ height: 20 }}
                className={`cursor-pointer transition-colors ${isHour ? "border-t border-[var(--border)]" : "border-t border-[var(--surface-2)]"} ${isSel ? "bg-teal-600/50 hover:bg-teal-600/40" : "hover:bg-teal-600/10"}`}
                onMouseDown={() => { const m = isSel ? "remove" : "add"; setDragMode(m); setIsDragging(true); toggle(activeDate, slot, m); }}
                onMouseEnter={() => { if (isDragging) toggle(activeDate, slot, dragMode); }}
                onMouseUp={() => setIsDragging(false)}
                onTouchStart={() => { const m = isSel ? "remove" : "add"; setDragMode(m); setIsDragging(true); toggle(activeDate, slot, m); }}
                onTouchEnd={() => setIsDragging(false)}
              />,
            ];
          })}
        </div>
      </div>

      <p className="text-xs text-[var(--muted)]">
        {totalMarked > 0 ? `${totalMarked} time slot${totalMarked !== 1 ? "s" : ""} marked across ${dates.filter(d => (selected[d]?.size ?? 0) > 0).length} day${dates.filter(d => (selected[d]?.size ?? 0) > 0).length !== 1 ? "s" : ""}` : "No availability marked yet"}
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
interface PollInfo {
  id: string;
  group_id: string;
  title: string;
  window_start: string;
  window_end: string;
  closes_at: string | null;
  status: string;
}

export default function PublicPollPage() {
  const { token } = useParams() as { token: string };
  const router = useRouter();
  const supabase = createClient();

  const [poll, setPoll] = useState<PollInfo | null>(null);
  const [groupName, setGroupName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [existingResponses, setExistingResponses] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => { load(); }, [token]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    // Fetch poll via the SECURITY DEFINER RPC (no RLS barrier)
    const { data: rows, error } = await supabase.rpc("get_poll_by_token", { p_token: token });
    if (error || !rows || rows.length === 0) { setLoading(false); return; }
    const p = rows[0] as PollInfo;
    setPoll(p);

    // Fetch group name (public groups table read allowed by anon for name only via RLS — may fail, that's fine)
    const { data: g } = await supabase.from("groups").select("name").eq("id", p.group_id).single();
    setGroupName(g?.name ?? "");

    // If logged in, fetch existing responses for this poll
    if (user) {
      const dates = dateRange(p.window_start, p.window_end);
      const { data: responses } = await supabase
        .from("poll_responses")
        .select("response_date, available_slots")
        .eq("poll_id", p.id)
        .eq("user_id", user.id);
      const map: Record<string, string[]> = {};
      for (const d of dates) map[d] = [];
      for (const r of (responses ?? [])) map[r.response_date] = r.available_slots ?? [];
      setExistingResponses(map);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--muted)] text-sm">Loading poll…</p>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-3xl">📅</p>
          <p className="text-lg font-bold">Poll not found</p>
          <p className="text-sm text-[var(--muted)]">This link may be invalid or the poll was deleted.</p>
          <Link href="/dashboard"><Button size="sm" variant="secondary">Go home</Button></Link>
        </div>
      </div>
    );
  }

  const isClosed = poll.status === "closed" || (poll.closes_at && new Date(poll.closes_at) < new Date());
  const dates = dateRange(poll.window_start, poll.window_end);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              {groupName && <p className="text-xs text-teal-400 font-medium mb-1">👥 {groupName}</p>}
              <h1 className="text-xl font-black">{poll.title}</h1>
              <p className="text-sm text-[var(--muted-light)] mt-0.5">
                {shortDate(poll.window_start)} – {shortDate(poll.window_end)}
              </p>
            </div>
            <span className={`text-xs border px-2.5 py-1 rounded-full shrink-0 mt-1 ${
              isClosed ? "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"
              : "bg-teal-600/20 text-teal-400 border-teal-600/30"
            }`}>
              {isClosed ? "Closed" : "Open"}
            </span>
          </div>
          {poll.closes_at && !isClosed && (
            <p className="text-xs text-yellow-400">
              ⏰ Closes {new Date(poll.closes_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          )}
        </div>

        {saved && (
          <div className="bg-teal-600/20 border border-teal-600/40 rounded-xl px-4 py-3 text-sm text-teal-300 text-center">
            ✓ Availability saved! The group organizer will see your response.
          </div>
        )}

        {isClosed ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-center space-y-2">
            <p className="text-2xl">🔒</p>
            <p className="font-semibold">This poll is closed</p>
            <p className="text-sm text-[var(--muted)]">Responses are no longer being accepted.</p>
          </div>
        ) : userId ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
            <AvailabilityGrid
              token={token}
              dates={dates}
              existingResponses={existingResponses}
              onSaved={() => setSaved(true)}
            />
          </div>
        ) : (
          /* Guest prompt */
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <div className="text-center space-y-1">
              <p className="text-2xl">🙋</p>
              <p className="font-bold">Add your availability</p>
              <p className="text-sm text-[var(--muted)]">Sign in or create a free account to respond to this poll.</p>
            </div>
            <Link href={`/auth/signup?redirect=/poll/${token}`}>
              <Button className="w-full">Create Free Account</Button>
            </Link>
            <Link href={`/auth/login?redirect=/poll/${token}`}>
              <Button variant="secondary" className="w-full">Log In</Button>
            </Link>
            <div className="border-t border-[var(--border)] pt-3 space-y-1.5">
              <p className="text-xs font-semibold text-[var(--muted-light)]">Free account lets you:</p>
              <ul className="text-xs text-[var(--muted)] space-y-1">
                <li>✓ Mark availability on this poll</li>
                <li>✓ Join groups and see schedules</li>
                <li>✓ Get notified when a game is scheduled</li>
              </ul>
            </div>
          </div>
        )}

        {/* Link back for logged-in users who are group members */}
        {userId && (
          <p className="text-center text-xs text-[var(--muted)]">
            <Link href={`/groups/${poll.group_id}`} className="hover:text-teal-400 transition-colors">
              View group →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
