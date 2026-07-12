"use client";
import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

const SLOT_MINUTES = 15;
const DAY_START_HOUR = 6;  // 6 AM
const DAY_END_HOUR = 23;   // 11 PM

function generateSlots(): string[] {
  const slots: string[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

const ALL_SLOTS = generateSlots();

function formatHour(slot: string) {
  const [h, m] = slot.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, "0")}${ampm}`;
}

function shortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

interface Props {
  pollId: string;
  userId: string;
  dates: string[];
  myResponses: any[];
}

export function AvailabilityGrid({ pollId, userId, dates, myResponses }: Props) {
  // Build initial state from existing responses
  const initSelected = (): Record<string, Set<string>> => {
    const map: Record<string, Set<string>> = {};
    for (const r of myResponses) {
      map[r.response_date] = new Set(r.available_slots ?? []);
    }
    return map;
  };

  const [selected, setSelected] = useState<Record<string, Set<string>>>(initSelected);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeDate, setActiveDate] = useState(dates[0] ?? "");
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");

  const toggle = useCallback((date: string, slot: string, mode?: "add" | "remove") => {
    setSelected((prev) => {
      const next = { ...prev };
      const set = new Set(prev[date] ?? []);
      const effectiveMode = mode ?? (set.has(slot) ? "remove" : "add");
      if (effectiveMode === "add") set.add(slot);
      else set.delete(slot);
      next[date] = set;
      return next;
    });
    setSaved(false);
  }, []);

  async function save() {
    setSaving(true);
    const supabase = createClient();

    const rows = Object.entries(selected).map(([date, slots]) => ({
      poll_id: pollId,
      user_id: userId,
      response_date: date,
      available_slots: Array.from(slots).sort(),
    }));

    // Upsert all, delete days with no slots
    const daysWithSlots = rows.filter((r) => r.available_slots.length > 0);
    const daysEmpty = rows.filter((r) => r.available_slots.length === 0);

    if (daysWithSlots.length > 0) {
      await supabase.from("poll_responses").upsert(daysWithSlots, {
        onConflict: "poll_id,user_id,response_date",
      });
    }
    for (const row of daysEmpty) {
      await supabase
        .from("poll_responses")
        .delete()
        .eq("poll_id", row.poll_id)
        .eq("user_id", row.user_id)
        .eq("response_date", row.response_date);
    }

    setSaving(false);
    setSaved(true);
  }

  const currentSlots = selected[activeDate] ?? new Set<string>();

  // Show only hour labels at the top of each hour
  const hourLabels = ALL_SLOTS.filter((s) => s.endsWith(":00"));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Your Availability</h2>
        <Button onClick={save} loading={saving} variant="secondary" size="sm">
          {saved ? "✓ Saved" : "Save"}
        </Button>
      </div>

      <p className="text-xs text-[var(--muted)]">
        Tap or drag to mark when you&apos;re free. Tap a day tab to switch days.
      </p>

      {/* Day tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {dates.map((d) => {
          const hasSlots = (selected[d]?.size ?? 0) > 0;
          return (
            <button
              key={d}
              onClick={() => setActiveDate(d)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                d === activeDate
                  ? "bg-teal-600/30 text-teal-300 border-teal-600/50"
                  : hasSlots
                  ? "bg-[var(--surface-2)] text-teal-400 border-teal-600/20"
                  : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)] hover:border-teal-600/30"
              }`}
            >
              {shortDate(d)}
              {hasSlots && <span className="ml-1 text-teal-400">·</span>}
            </button>
          );
        })}
      </div>

      {/* Slot grid for active date */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden select-none">
        <div className="grid" style={{ gridTemplateColumns: "48px 1fr" }}>
          {/* Time labels column + slot column */}
          {ALL_SLOTS.map((slot, i) => {
            const isHour = slot.endsWith(":00");
            const isSelected = currentSlots.has(slot);
            return (
              <>
                <div
                  key={`label-${slot}`}
                  className={`px-2 flex items-center justify-end text-[10px] text-[var(--muted)] border-r border-[var(--border)] ${isHour ? "border-t border-[var(--border)]" : "border-t border-[var(--surface-2)]"}`}
                  style={{ height: 20 }}
                >
                  {isHour ? formatHour(slot) : ""}
                </div>
                <div
                  key={`slot-${slot}`}
                  className={`cursor-pointer transition-colors ${isHour ? "border-t border-[var(--border)]" : "border-t border-[var(--surface-2)]"} ${
                    isSelected ? "bg-teal-600/50 hover:bg-teal-600/40" : "hover:bg-teal-600/10"
                  }`}
                  style={{ height: 20 }}
                  onMouseDown={() => {
                    const mode = isSelected ? "remove" : "add";
                    setDragMode(mode);
                    setIsDragging(true);
                    toggle(activeDate, slot, mode);
                  }}
                  onMouseEnter={() => {
                    if (isDragging) toggle(activeDate, slot, dragMode);
                  }}
                  onMouseUp={() => setIsDragging(false)}
                  onTouchStart={() => {
                    const mode = isSelected ? "remove" : "add";
                    setDragMode(mode);
                    setIsDragging(true);
                    toggle(activeDate, slot, mode);
                  }}
                  onTouchEnd={() => setIsDragging(false)}
                />
              </>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-[var(--muted)]">
        {currentSlots.size > 0
          ? `${currentSlots.size} slot${currentSlots.size !== 1 ? "s" : ""} marked for ${shortDate(activeDate)}`
          : `No availability marked for ${shortDate(activeDate)}`}
      </p>
    </div>
  );
}
