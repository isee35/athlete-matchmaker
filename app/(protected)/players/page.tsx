"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { SPORTS } from "@/lib/sports";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Player {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  high_five_count: number;
  lobby_count: number;
  user_sports: { sport_id: string; skill_level: string | null }[];
}

export default function PlayersPage() {
  const supabase = createClient();
  const [q, setQ] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q, sportFilter), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, sportFilter]);

  async function search(query: string, sport: string) {
    setLoading(true);
    setSearched(true);

    let dbQuery = supabase
      .from("profiles")
      .select("id, username, first_name, last_name, city, state, bio, high_five_count, lobby_count, user_sports(sport_id, skill_level)")
      .eq("onboarding_complete", true)
      .order("lobby_count", { ascending: false })
      .limit(40);

    if (query.trim()) {
      dbQuery = dbQuery.or(
        `username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,city.ilike.%${query}%`
      );
    }

    const { data } = await dbQuery;
    let results = (data as Player[]) ?? [];

    if (sport) {
      results = results.filter((p) => p.user_sports?.some((s) => s.sport_id === sport));
    }

    setPlayers(results);
    setLoading(false);
  }

  const topSports = SPORTS.slice(0, 12);

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black">🏅 Find Players</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Search athletes by name, username, or city — follow them or send a high five.</p>
      </div>

      {/* Search input */}
      <div className="space-y-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, @username, or city…"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-teal-600/60"
          autoFocus
        />

        {/* Sport quick-filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSportFilter("")}
            className={`px-3 py-1.5 rounded-xl text-xs border transition-colors cursor-pointer ${!sportFilter ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]"}`}
          >
            All sports
          </button>
          {topSports.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSportFilter(sportFilter === s.id ? "" : s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-colors cursor-pointer ${sportFilter === s.id ? "bg-pink-600/20 border-pink-500 text-pink-300" : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]"}`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="text-sm text-[var(--muted)] py-4 text-center">Searching…</div>
      )}

      {!loading && searched && players.length === 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--muted)] text-sm">
          No players found. Try a different search.
        </div>
      )}

      {!loading && !searched && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--muted)] text-sm">
          Start typing to find athletes near you.
        </div>
      )}

      <div className="space-y-2">
        {players.map((player) => {
          const displayName = [player.first_name, player.last_name].filter(Boolean).join(" ") || player.username;
          const avatarLetter = (player.first_name?.[0] ?? player.username[0]).toUpperCase();
          const playerSports = (player.user_sports ?? []).slice(0, 4);

          return (
            <Link
              key={player.id}
              href={`/u/${player.username}`}
              className="flex items-center gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 hover:border-teal-600/40 transition-colors"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-pink-600 flex items-center justify-center text-sm font-black text-white shrink-0">
                {avatarLetter}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{displayName}</span>
                  <span className="text-xs text-[var(--muted)]">@{player.username}</span>
                </div>
                {(player.city || player.state) && (
                  <p className="text-xs text-[var(--muted)] mt-0.5">📍 {[player.city, player.state].filter(Boolean).join(", ")}</p>
                )}
                {playerSports.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {playerSports.map((us) => {
                      const sport = SPORTS.find((s) => s.id === us.sport_id);
                      return sport ? (
                        <span key={us.sport_id} className="text-xs bg-[var(--surface-2)] border border-[var(--border)] px-2 py-0.5 rounded-lg">
                          {sport.emoji} {sport.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="text-right shrink-0 space-y-0.5">
                <p className="text-xs text-[var(--muted)]">🙌 {player.high_five_count}</p>
                <p className="text-xs text-[var(--muted)]">{player.lobby_count} lobbies</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
