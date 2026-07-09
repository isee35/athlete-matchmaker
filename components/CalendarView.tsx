"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Lobby {
  id: string;
  title: string;
  sport_id: string;
  date: string;
  time?: string;
  location?: string;
  max_players?: number;
  current_players?: number;
  status: string;
  is_private?: boolean;
}

interface Props {
  initialMonth: string; // "YYYY-MM"
  initialData: Record<string, Lobby[]>;
  userSportIds?: string[]; // pre-filtered sport IDs, empty = show all
  sportEmojis: Record<string, string>; // sportId -> emoji
  sportColors: Record<string, string>; // sportId -> tailwind color class
  adminMode?: boolean;
  adminRegion?: string;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function CalendarView({ initialMonth, initialData, userSportIds, sportEmojis, sportColors, adminMode, adminRegion }: Props) {
  const [month, setMonth] = useState(initialMonth);
  const [byDate, setByDate] = useState<Record<string, Lobby[]>>(initialData);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState(adminRegion ?? "");

  const [year, mon] = month.split("-").map(Number);

  const fetchMonth = useCallback(async (m: string, region?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ month: m });
    if (userSportIds && userSportIds.length > 0) params.set("sports", userSportIds.join(","));
    if (region) params.set("region", region);
    try {
      const res = await fetch(`/api/lobbies/calendar?${params}`);
      const json = await res.json();
      setByDate(json.byDate ?? {});
    } finally {
      setLoading(false);
    }
  }, [userSportIds]);

  function prevMonth() {
    const d = new Date(year, mon - 2, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setMonth(m);
    setSelectedDate(null);
    fetchMonth(m, regionFilter);
  }

  function nextMonth() {
    const d = new Date(year, mon, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setMonth(m);
    setSelectedDate(null);
    fetchMonth(m, regionFilter);
  }

  function applyRegionFilter(r: string) {
    setRegionFilter(r);
    fetchMonth(month, r);
  }

  // Build calendar grid
  const firstDow = new Date(year, mon - 1, 1).getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: `${month}-${String(d).padStart(2, "0")}`,
      day: d,
    });
  }

  // Flatten all lobbies for list view, sorted by date
  const allLobbies = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([date, lobbies]) => lobbies.map((l) => ({ ...l, date })));

  const selectedLobbies = selectedDate ? (byDate[selectedDate] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} disabled={loading} className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 cursor-pointer">
            ‹
          </button>
          <h2 className="text-lg font-bold min-w-[160px] text-center">
            {MONTH_NAMES[mon - 1]} {year}
          </h2>
          <button onClick={nextMonth} disabled={loading} className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 cursor-pointer">
            ›
          </button>
          {loading && <span className="text-xs text-[var(--muted)] animate-pulse">Loading…</span>}
        </div>

        <div className="flex items-center gap-2">
          {adminMode && (
            <input
              type="text"
              placeholder="Filter by region…"
              value={regionFilter}
              onChange={(e) => applyRegionFilter(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-teal-600/60 w-40"
            />
          )}
          <div className="flex bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${view === "calendar" ? "bg-teal-600/20 text-teal-400" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              📅 Calendar
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${view === "list" ? "bg-teal-600/20 text-teal-400" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              ☰ List
            </button>
          </div>
        </div>
      </div>

      {/* Calendar view */}
      {view === "calendar" && (
        <div className="space-y-3">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-px">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-xs text-[var(--muted)] py-1 font-medium">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell.date) return <div key={`empty-${i}`} />;
              const lobbies = byDate[cell.date] ?? [];
              const isToday = cell.date === today;
              const isSelected = cell.date === selectedDate;
              const isPast = cell.date < today;

              // Group by sport for color dots
              const sportGroups: Record<string, number> = {};
              lobbies.forEach((l) => {
                sportGroups[l.sport_id] = (sportGroups[l.sport_id] ?? 0) + 1;
              });

              return (
                <button
                  key={cell.date}
                  onClick={() => setSelectedDate(isSelected ? null : cell.date!)}
                  className={`relative min-h-[64px] sm:min-h-[80px] rounded-xl border p-1.5 text-left transition-all cursor-pointer flex flex-col ${
                    isSelected
                      ? "bg-teal-900/30 border-teal-500"
                      : isToday
                        ? "bg-pink-900/20 border-pink-600/50"
                        : isPast
                          ? "bg-[var(--surface)] border-[var(--border)] opacity-60"
                          : "bg-[var(--surface)] border-[var(--border)] hover:border-teal-600/40"
                  }`}
                >
                  <span className={`text-xs font-semibold ${isToday ? "text-pink-400" : isSelected ? "text-teal-400" : "text-[var(--foreground)]"}`}>
                    {cell.day}
                  </span>
                  {lobbies.length > 0 && (
                    <div className="mt-auto space-y-0.5">
                      {/* Sport color pills */}
                      <div className="flex flex-wrap gap-0.5">
                        {Object.entries(sportGroups).slice(0, 3).map(([sportId, count]) => (
                          <span
                            key={sportId}
                            className="text-[10px] leading-none px-1 py-0.5 rounded-md bg-teal-600/25 text-teal-300 font-medium"
                            title={sportId}
                          >
                            {sportEmojis[sportId] ?? "🏅"}{count > 1 ? ` ${count}` : ""}
                          </span>
                        ))}
                        {Object.keys(sportGroups).length > 3 && (
                          <span className="text-[10px] leading-none px-1 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--muted)]">
                            +{Object.keys(sportGroups).length - 3}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--muted)] leading-none">
                        {lobbies.length} {lobbies.length === 1 ? "event" : "events"}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day detail panel */}
          {selectedDate && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                <button onClick={() => setSelectedDate(null)} className="text-[var(--muted)] hover:text-[var(--foreground)] text-lg leading-none cursor-pointer">×</button>
              </div>
              {selectedLobbies.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No open lobbies this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedLobbies.map((lobby) => (
                    <LobbyCard key={lobby.id} lobby={lobby} emoji={sportEmojis[lobby.sport_id] ?? "🏅"} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="space-y-2">
          {allLobbies.length === 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center text-[var(--muted)]">
              No open lobbies this month.
            </div>
          )}
          {allLobbies.map((lobby) => (
            <LobbyCard key={lobby.id} lobby={lobby} emoji={sportEmojis[lobby.sport_id] ?? "🏅"} showDate />
          ))}
        </div>
      )}
    </div>
  );
}

function LobbyCard({ lobby, emoji, showDate }: { lobby: Lobby; emoji: string; showDate?: boolean }) {
  const spotsLeft = lobby.max_players ? lobby.max_players - (lobby.current_players ?? 0) : null;
  return (
    <Link href={`/lobbies/${lobby.id}`}>
      <div className="flex items-center gap-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 hover:border-teal-600/40 transition-colors cursor-pointer">
        <span className="text-2xl shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{lobby.title}</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {showDate && `${lobby.date} · `}
            {lobby.time?.slice(0, 5) && `${lobby.time.slice(0, 5)} · `}
            {lobby.location && `${lobby.location}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          {spotsLeft !== null && (
            <p className={`text-xs font-medium ${spotsLeft <= 2 ? "text-red-400" : "text-teal-400"}`}>
              {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
            </p>
          )}
          {lobby.is_private && <p className="text-xs text-[var(--muted)]">🔒 private</p>}
        </div>
      </div>
    </Link>
  );
}
