"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23;
const SLOT_MINUTES = 15;

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

function shortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatHour(slot: string) {
  const [h, m] = slot.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${ampm}` : "";
}

function heatColor(count: number, max: number): string {
  if (count === 0) return "transparent";
  const ratio = count / max;
  if (ratio >= 0.8) return "rgba(20,184,166,0.85)";  // teal-500
  if (ratio >= 0.6) return "rgba(20,184,166,0.60)";
  if (ratio >= 0.4) return "rgba(20,184,166,0.40)";
  if (ratio >= 0.2) return "rgba(20,184,166,0.20)";
  return "rgba(20,184,166,0.08)";
}

interface Props {
  responses: any[];
  dates: string[];
  totalMembers: number;
  groupId: string;
  sportId: string;
  pollTitle: string;
}

export function OverlapHeatmap({ responses, dates, totalMembers, groupId, sportId, pollTitle }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<{ date: string; slot: string } | null>(null);

  // Build count map: date -> slot -> count
  const countMap: Record<string, Record<string, number>> = {};
  for (const r of responses) {
    if (!countMap[r.response_date]) countMap[r.response_date] = {};
    for (const slot of (r.available_slots ?? [])) {
      countMap[r.response_date][slot] = (countMap[r.response_date][slot] ?? 0) + 1;
    }
  }

  // Find the global max for color scaling
  let globalMax = 1;
  for (const dateMap of Object.values(countMap)) {
    for (const c of Object.values(dateMap)) {
      if (c > globalMax) globalMax = c;
    }
  }

  // Find top slots for quick summary
  const topSlots: Array<{ date: string; slot: string; count: number }> = [];
  for (const [date, slots] of Object.entries(countMap)) {
    for (const [slot, count] of Object.entries(slots)) {
      topSlots.push({ date, slot, count });
    }
  }
  topSlots.sort((a, b) => b.count - a.count);
  const top3 = topSlots.slice(0, 3);

  function createLobbyFromSlot(date: string, slot: string) {
    const [h, m] = slot.split(":").map(Number);
    const endH = h + 2 > 23 ? 23 : h + 2;
    const endSlot = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const params = new URLSearchParams({
      group: groupId,
      sport: sportId,
      date,
      start: slot,
      end: endSlot,
      title: pollTitle,
    });
    router.push(`/lobbies/new?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Availability Overview</h2>
        <p className="text-xs text-[var(--muted)] mt-0.5">Darker = more people free. Tap a slot to create a lobby.</p>
      </div>

      {/* Top slots summary */}
      {top3.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--muted-light)] font-medium uppercase tracking-wider">Best Times</p>
          <div className="flex gap-2 flex-wrap">
            {top3.map(({ date, slot, count }) => (
              <button
                key={`${date}-${slot}`}
                onClick={() => createLobbyFromSlot(date, slot)}
                className="flex items-center gap-2 bg-teal-600/20 border border-teal-600/40 text-teal-300 px-3 py-2 rounded-xl text-xs hover:bg-teal-600/30 transition-colors"
              >
                <span>{shortDate(date)}</span>
                <span className="text-[var(--muted)]">·</span>
                <span>{slot}</span>
                <span className="ml-1 bg-teal-600/30 px-1.5 py-0.5 rounded-full font-semibold">
                  {count}/{totalMembers}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Full heatmap: scroll horizontally by date */}
      <div className="overflow-x-auto">
        <div className="flex gap-px" style={{ minWidth: dates.length * 52 }}>
          {/* Time axis */}
          <div className="flex flex-col shrink-0" style={{ width: 40 }}>
            <div style={{ height: 32 }} />
            {ALL_SLOTS.map((slot) => (
              <div key={slot} style={{ height: 12 }} className="flex items-center justify-end pr-1">
                <span className="text-[9px] text-[var(--muted)]">{formatHour(slot)}</span>
              </div>
            ))}
          </div>

          {/* Date columns */}
          {dates.map((date) => (
            <div key={date} className="flex flex-col shrink-0" style={{ width: 48 }}>
              <div
                style={{ height: 32 }}
                className="flex items-center justify-center text-[9px] text-[var(--muted)] px-0.5 text-center leading-tight"
              >
                {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
              </div>
              {ALL_SLOTS.map((slot) => {
                const count = countMap[date]?.[slot] ?? 0;
                const isSelected = selected?.date === date && selected?.slot === slot;
                return (
                  <div
                    key={slot}
                    style={{
                      height: 12,
                      backgroundColor: heatColor(count, globalMax),
                      border: isSelected ? "1px solid rgba(20,184,166,0.9)" : "1px solid transparent",
                    }}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    title={count > 0 ? `${count}/${totalMembers} available` : ""}
                    onClick={() => {
                      if (count > 0) {
                        setSelected({ date, slot });
                        createLobbyFromSlot(date, slot);
                      }
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
