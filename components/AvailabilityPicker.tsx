"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { SPORTS } from "@/lib/sports";

// ─── constants ────────────────────────────────────────────────────────────────
const SLOT_START  = 12;  // 6:00 AM  (slot = hour*2 + half)
const SLOT_END    = 46;  // 11:00 PM
const SLOT_H      = 20;  // px per 30-min slot
const DAYS_SHORT  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── helpers ──────────────────────────────────────────────────────────────────
function slotToLabel(slot: number) {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? "00" : "30";
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m}${ampm}`;
}

function slotToTime(slot: number) {
  const h = Math.floor(slot / 2).toString().padStart(2, "0");
  const m = slot % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
}

function timeToSlot(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 2 + (m >= 30 ? 1 : 0);
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── types ────────────────────────────────────────────────────────────────────
export interface RecurringBlock {
  id: string;
  dayOfWeek: number;
  startSlot: number;  // inclusive
  endSlot: number;    // exclusive
  sportIds: string[]; // ['any'] = any sport
}

export interface SpecificBlock {
  id: string;
  date: string;       // YYYY-MM-DD
  startSlot: number;
  endSlot: number;
  sportIds: string[];
}

interface Props {
  userSportIds: string[];
  initialRecurring?: RecurringBlock[];
  initialSpecific?: SpecificBlock[];
  onChange: (recurring: RecurringBlock[], specific: SpecificBlock[]) => void;
}

// ─── sport picker ─────────────────────────────────────────────────────────────
function SportPicker({
  userSportIds,
  selected,
  onChange,
}: {
  userSportIds: string[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const isAny = selected.includes("any");

  function toggleAny() {
    onChange(isAny ? [] : ["any"]);
  }

  function toggleSport(id: string) {
    const next = selected.filter((s) => s !== "any");
    onChange(next.includes(id) ? next.filter((s) => s !== id) : [...next, id]);
  }

  const sports = userSportIds.map((id) => SPORTS.find((s) => s.id === id)).filter(Boolean) as typeof SPORTS;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      <button
        type="button"
        onClick={toggleAny}
        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${isAny ? "bg-teal-600/30 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)]"}`}
      >
        🎯 Any sport
      </button>
      {sports.map((sport) => (
        <button
          key={sport.id}
          type="button"
          onClick={() => toggleSport(sport.id)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${!isAny && selected.includes(sport.id) ? "bg-teal-600/30 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)]"} ${isAny ? "opacity-40 pointer-events-none" : ""}`}
        >
          {sport.emoji} {sport.label}
        </button>
      ))}
    </div>
  );
}

// ─── weekly grid ─────────────────────────────────────────────────────────────
function WeeklyGrid({
  blocks,
  userSportIds,
  onAdd,
  onUpdate,
  onRemove,
}: {
  blocks: RecurringBlock[];
  userSportIds: string[];
  onAdd: (block: RecurringBlock) => void;
  onUpdate: (id: string, patch: Partial<RecurringBlock>) => void;
  onRemove: (id: string) => void;
}) {
  const [dragging, setDragging]   = useState(false);
  const [dragCol, setDragCol]     = useState<number | null>(null);
  const [dragA, setDragA]         = useState<number | null>(null);
  const [dragB, setDragB]         = useState<number | null>(null);
  const [activeId, setActiveId]   = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const SLOTS = SLOT_END - SLOT_START + 1; // 35

  function slotFromY(clientY: number, colEl: Element) {
    const rect = colEl.getBoundingClientRect();
    const y = clientY - rect.top;
    return SLOT_START + Math.max(0, Math.min(SLOTS - 1, Math.floor(y / SLOT_H)));
  }

  function onMouseDown(e: React.MouseEvent, col: number) {
    if ((e.target as Element).closest("[data-block]")) return;
    e.preventDefault();
    const colEl = (e.currentTarget as Element);
    const slot = slotFromY(e.clientY, colEl);
    setDragging(true);
    setDragCol(col);
    setDragA(slot);
    setDragB(slot);
    setActiveId(null);
  }

  function onMouseMove(e: React.MouseEvent, col: number) {
    if (!dragging || dragCol !== col) return;
    e.preventDefault();
    const colEl = e.currentTarget as Element;
    setDragB(slotFromY(e.clientY, colEl));
  }

  function onMouseUp() {
    if (!dragging || dragA === null || dragB === null || dragCol === null) {
      setDragging(false);
      return;
    }
    const start = Math.min(dragA, dragB);
    const end   = Math.max(dragA, dragB) + 1;
    const newBlock: RecurringBlock = {
      id: uid(),
      dayOfWeek: dragCol,
      startSlot: start,
      endSlot: end,
      sportIds: ["any"],
    };
    onAdd(newBlock);
    setActiveId(newBlock.id);
    setDragging(false);
    setDragA(null);
    setDragB(null);
    setDragCol(null);
  }

  // dismiss active on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!(e.target as Element).closest("[data-block],[data-picker]")) {
        setActiveId(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // hour labels
  const hourLabels: { slot: number; label: string }[] = [];
  for (let s = SLOT_START; s <= SLOT_END; s += 2) {
    hourLabels.push({ slot: s, label: slotToLabel(s) });
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div ref={gridRef} className="flex" style={{ minWidth: 520 }}>
        {/* Time labels */}
        <div className="shrink-0 w-12 pt-6" style={{ position: "relative", height: SLOTS * SLOT_H }}>
          {hourLabels.map(({ slot, label }) => (
            <div
              key={slot}
              className="absolute right-1 text-[10px] text-[var(--muted)] leading-none"
              style={{ top: (slot - SLOT_START) * SLOT_H - 5 }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS_SHORT.map((day, col) => {
          const colBlocks = blocks.filter((b) => b.dayOfWeek === col);
          const dragActive = dragging && dragCol === col && dragA !== null && dragB !== null;
          const dragTop  = dragActive ? (Math.min(dragA!, dragB!) - SLOT_START) * SLOT_H : 0;
          const dragH    = dragActive ? (Math.abs(dragB! - dragA!) + 1) * SLOT_H : 0;

          return (
            <div key={col} className="flex-1 flex flex-col min-w-[50px]">
              {/* Day header */}
              <div className="text-center text-xs font-semibold text-[var(--muted)] pb-1 h-6 leading-6">{day}</div>

              {/* Grid column */}
              <div
                className="relative border-l border-[var(--border)] select-none"
                style={{ height: SLOTS * SLOT_H, cursor: dragging && dragCol === col ? "ns-resize" : "crosshair" }}
                onMouseDown={(e) => onMouseDown(e, col)}
                onMouseMove={(e) => onMouseMove(e, col)}
                onMouseUp={onMouseUp}
              >
                {/* Hour lines */}
                {Array.from({ length: SLOTS }, (_, i) => (
                  <div
                    key={i}
                    className={`absolute w-full border-t ${i % 2 === 0 ? "border-[var(--border)]" : "border-[var(--border)]/30"}`}
                    style={{ top: i * SLOT_H }}
                  />
                ))}

                {/* Drag preview */}
                {dragActive && (
                  <div
                    className="absolute inset-x-0 bg-teal-500/30 border border-teal-500/60 rounded pointer-events-none z-10"
                    style={{ top: dragTop, height: dragH }}
                  />
                )}

                {/* Existing blocks */}
                {colBlocks.map((block) => {
                  const top  = (block.startSlot - SLOT_START) * SLOT_H;
                  const h    = (block.endSlot - block.startSlot) * SLOT_H;
                  const isActive = activeId === block.id;
                  const label = `${slotToLabel(block.startSlot)}–${slotToLabel(block.endSlot)}`;

                  return (
                    <div key={block.id} data-block>
                      <div
                        className={`absolute inset-x-0.5 rounded cursor-pointer z-20 flex flex-col overflow-hidden transition-all ${isActive ? "ring-2 ring-white/40" : ""}`}
                        style={{
                          top,
                          height: h,
                          background: block.sportIds.includes("any")
                            ? "linear-gradient(135deg,#0d9488cc,#ec4899cc)"
                            : "#0d948899",
                          border: "1px solid rgba(255,255,255,0.15)",
                        }}
                        onClick={() => setActiveId(isActive ? null : block.id)}
                      >
                        {h >= 32 && (
                          <span className="text-[9px] font-semibold text-white/90 px-1 pt-0.5 leading-tight">
                            {label}
                          </span>
                        )}
                      </div>

                      {/* Editor popover */}
                      {isActive && (
                        <div
                          data-picker
                          className="absolute left-0 right-0 z-40 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 shadow-xl space-y-2"
                          style={{ top: Math.max(0, top + h + 2), minWidth: 200 }}
                        >
                          <p className="text-xs font-semibold text-[var(--foreground)]">{DAYS_SHORT[col]} · {label}</p>
                          <SportPicker
                            userSportIds={userSportIds}
                            selected={block.sportIds}
                            onChange={(ids) => onUpdate(block.id, { sportIds: ids })}
                          />
                          <button
                            type="button"
                            onClick={() => { onRemove(block.id); setActiveId(null); }}
                            className="text-xs text-red-400 hover:text-red-300 mt-1 cursor-pointer"
                          >
                            🗑 Remove block
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-[var(--muted)] mt-2 pl-12">Click and drag to add a time block. Click a block to edit sports or delete.</p>
    </div>
  );
}

// ─── month calendar ───────────────────────────────────────────────────────────
function MonthCalendar({
  blocks,
  userSportIds,
  onAdd,
  onUpdate,
  onRemove,
}: {
  blocks: SpecificBlock[];
  userSportIds: string[];
  onAdd: (block: SpecificBlock) => void;
  onUpdate: (id: string, patch: Partial<SpecificBlock>) => void;
  onRemove: (id: string) => void;
}) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month).toLocaleString("en-US", { month: "long", year: "numeric" });

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function blocksForDate(day: number) {
    return blocks.filter((b) => b.date === dateStr(day));
  }

  function toggleDate(day: number) {
    const d = dateStr(day);
    const existing = blocks.filter((b) => b.date === d);
    if (existing.length > 0) {
      existing.forEach((b) => onRemove(b.id));
    } else {
      onAdd({ id: uid(), date: d, startSlot: 32, endSlot: 40, sportIds: ["any"] }); // 4pm–8pm default
    }
  }

  const isPast = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(23, 59, 59);
    return d < today;
  };

  // Unique selected dates
  const selectedDates = [...new Set(blocks.map((b) => b.date))].sort();

  return (
    <div className="space-y-5">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-lg">‹</button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button type="button" onClick={nextMonth} className="text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-lg">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-[var(--muted)] py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMon }, (_, i) => {
          const day = i + 1;
          const d = dateStr(day);
          const hasBlocks = blocksForDate(day).length > 0;
          const past = isPast(day);
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

          return (
            <button
              key={day}
              type="button"
              disabled={past}
              onClick={() => !past && toggleDate(day)}
              className={`relative aspect-square rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center
                ${past ? "opacity-25 cursor-default" : "hover:bg-[var(--surface-2)]"}
                ${hasBlocks ? "bg-teal-600/25 border border-teal-500/60 text-teal-300 hover:bg-teal-600/35" : "border border-transparent text-[var(--foreground)]"}
                ${isToday && !hasBlocks ? "border-[var(--muted)]/50" : ""}
              `}
            >
              {day}
              {hasBlocks && (
                <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-teal-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected dates editor */}
      {selectedDates.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-[var(--border)]">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Your selected days</p>
          {selectedDates.map((date) => {
            const dateBlocks = blocks.filter((b) => b.date === date);
            const display = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            return (
              <div key={date} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{display}</p>
                  <button
                    type="button"
                    onClick={() => dateBlocks.forEach((b) => onRemove(b.id))}
                    className="text-[var(--muted)] hover:text-red-400 text-sm cursor-pointer"
                  >✕</button>
                </div>
                {dateBlocks.map((block) => (
                  <div key={block.id} className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-[var(--muted)]">From</label>
                        <input
                          type="time"
                          value={slotToTime(block.startSlot)}
                          onChange={(e) => onUpdate(block.id, { startSlot: timeToSlot(e.target.value) })}
                          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--foreground)] focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-[var(--muted)]">To</label>
                        <input
                          type="time"
                          value={slotToTime(block.endSlot)}
                          onChange={(e) => onUpdate(block.id, { endSlot: timeToSlot(e.target.value) })}
                          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--foreground)] focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => onAdd({ id: uid(), date, startSlot: block.endSlot, endSlot: Math.min(block.endSlot + 4, 48), sportIds: ["any"] })}
                        className="text-xs text-teal-400 hover:text-teal-300 cursor-pointer"
                      >
                        + window
                      </button>
                    </div>
                    <SportPicker
                      userSportIds={userSportIds}
                      selected={block.sportIds}
                      onChange={(ids) => onUpdate(block.id, { sportIds: ids })}
                    />
                    {dateBlocks.length > 1 && (
                      <button type="button" onClick={() => onRemove(block.id)} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">
                        🗑 Remove this window
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {selectedDates.length === 0 && (
        <p className="text-xs text-[var(--muted)] text-center py-2">Tap any upcoming day to mark yourself available.</p>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export function AvailabilityPicker({ userSportIds, initialRecurring = [], initialSpecific = [], onChange }: Props) {
  const [tab, setTab]               = useState<"weekly" | "specific">("weekly");
  const [recurring, setRecurring]   = useState<RecurringBlock[]>(initialRecurring);
  const [specific, setSpecific]     = useState<SpecificBlock[]>(initialSpecific);

  function notify(r: RecurringBlock[], s: SpecificBlock[]) {
    onChange(r, s);
  }

  // recurring helpers
  function addRecurring(b: RecurringBlock) {
    const next = [...recurring, b];
    setRecurring(next);
    notify(next, specific);
  }
  function updateRecurring(id: string, patch: Partial<RecurringBlock>) {
    const next = recurring.map((b) => b.id === id ? { ...b, ...patch } : b);
    setRecurring(next);
    notify(next, specific);
  }
  function removeRecurring(id: string) {
    const next = recurring.filter((b) => b.id !== id);
    setRecurring(next);
    notify(next, specific);
  }

  // specific helpers
  function addSpecific(b: SpecificBlock) {
    const next = [...specific, b];
    setSpecific(next);
    notify(recurring, next);
  }
  function updateSpecific(id: string, patch: Partial<SpecificBlock>) {
    const next = specific.map((b) => b.id === id ? { ...b, ...patch } : b);
    setSpecific(next);
    notify(recurring, next);
  }
  function removeSpecific(id: string) {
    const next = specific.filter((b) => b.id !== id);
    setSpecific(next);
    notify(recurring, next);
  }

  return (
    <div className="space-y-4">
      {/* Tab toggle */}
      <div className="flex bg-[var(--surface-2)] border border-[var(--border)] rounded-xl overflow-hidden w-full">
        {[
          { key: "weekly",   label: "↻ Weekly Recurring" },
          { key: "specific", label: "📅 Specific Days" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as "weekly" | "specific")}
            className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${tab === key ? "bg-teal-600/20 text-teal-300" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "weekly" && (
        <WeeklyGrid
          blocks={recurring}
          userSportIds={userSportIds}
          onAdd={addRecurring}
          onUpdate={updateRecurring}
          onRemove={removeRecurring}
        />
      )}

      {tab === "specific" && (
        <MonthCalendar
          blocks={specific}
          userSportIds={userSportIds}
          onAdd={addSpecific}
          onUpdate={updateSpecific}
          onRemove={removeSpecific}
        />
      )}

      {/* Summary chips */}
      {(recurring.length > 0 || specific.length > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {recurring.map((b) => (
            <span key={b.id} className="text-xs bg-teal-600/15 border border-teal-600/30 text-teal-400 px-2.5 py-1 rounded-full">
              {DAYS_SHORT[b.dayOfWeek]}s {slotToLabel(b.startSlot)}–{slotToLabel(b.endSlot)}
            </span>
          ))}
          {[...new Set(specific.map((b) => b.date))].map((date) => (
            <span key={date} className="text-xs bg-pink-600/15 border border-pink-600/30 text-pink-400 px-2.5 py-1 rounded-full">
              {new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DB format helpers (exported for save logic) ──────────────────────────────
export function recurringToDB(blocks: RecurringBlock[], userId: string) {
  return blocks.map((b) => ({
    user_id: userId,
    day_of_week: b.dayOfWeek,
    start_time: slotToTime(b.startSlot),
    end_time: slotToTime(b.endSlot),
    sport_ids: b.sportIds,
  }));
}

export function specificToDB(blocks: SpecificBlock[], userId: string) {
  return blocks.map((b) => ({
    user_id: userId,
    date: b.date,
    start_time: slotToTime(b.startSlot),
    end_time: slotToTime(b.endSlot),
    sport_ids: b.sportIds,
  }));
}

export function dbToRecurring(rows: any[]): RecurringBlock[] {
  return rows.map((r) => ({
    id: r.id ?? uid(),
    dayOfWeek: r.day_of_week,
    startSlot: timeToSlot(r.start_time),
    endSlot: timeToSlot(r.end_time),
    sportIds: r.sport_ids ?? ["any"],
  }));
}

export function dbToSpecific(rows: any[]): SpecificBlock[] {
  return rows.map((r) => ({
    id: r.id ?? uid(),
    date: r.date,
    startSlot: timeToSlot(r.start_time),
    endSlot: timeToSlot(r.end_time),
    sportIds: r.sport_ids ?? ["any"],
  }));
}
