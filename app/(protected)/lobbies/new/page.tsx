"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SPORTS, SPORT_CATEGORIES, getSportsByCategory } from "@/lib/sports";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

export default function NewLobby() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle]           = useState("");
  const [sportId, setSportId]       = useState("");
  const [subdivisionId, setSubdivisionId] = useState("");
  const [date, setDate]             = useState("");
  const [startTime, setStartTime]   = useState("");
  const [endTime, setEndTime]       = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationUrl, setLocationUrl]   = useState("");
  const [softCap, setSoftCap]       = useState("4");
  const [hardCap, setHardCap]       = useState("");
  const [allowOverflow, setAllowOverflow] = useState(false);
  const [overflowNotes, setOverflowNotes] = useState("");
  const [minSkillLevel, setMinSkillLevel] = useState("");
  const [skillFilterUntil, setSkillFilterUntil] = useState("");
  const [notes, setNotes]           = useState("");

  const selectedSport = SPORTS.find((s) => s.id === sportId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sportId) { setError("Select a sport."); return; }
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in."); setLoading(false); return; }

    const { data, error: lobbyError } = await supabase.from("lobbies").insert({
      owner_id: user.id,
      title,
      sport_id: sportId,
      subdivision_id: subdivisionId || null,
      date,
      start_time: startTime,
      end_time: endTime,
      location_name: locationName,
      location_url: locationUrl || null,
      soft_cap: parseInt(softCap),
      hard_cap: hardCap ? parseInt(hardCap) : null,
      allow_overflow: allowOverflow,
      overflow_notes: overflowNotes || null,
      min_skill_level: minSkillLevel || null,
      skill_filter_until: skillFilterUntil || null,
      notes: notes || null,
    }).select("id").single();

    if (lobbyError) { setError(lobbyError.message); setLoading(false); return; }

    // Auto-join as owner
    await supabase.from("lobby_members").insert({ lobby_id: data.id, user_id: user.id });

    router.push(`/lobbies/${data.id}`);
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-black">Create a Lobby</h1>
        <p className="text-sm text-[var(--muted-light)] mt-1">Rally your squad for a game.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">{error}</p>}

        <Input label="Lobby Title *" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Sunday Pickleball at Morley" />

        {/* Sport */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--muted-light)]">Sport *</label>
          <div className="space-y-3">
            {SPORT_CATEGORIES.map((cat) => {
              const sports = getSportsByCategory(cat.id);
              return (
                <div key={cat.id}>
                  <p className="text-xs text-[var(--muted)] mb-1">{cat.emoji} {cat.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sports.map((sport) => (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() => { setSportId(sport.id); setSubdivisionId(""); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${sportId === sport.id ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)] hover:border-teal-600"}`}
                      >
                        {sport.emoji} {sport.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subdivision */}
        {selectedSport && selectedSport.subdivisions.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--muted-light)]">Format</label>
            <div className="flex flex-wrap gap-2">
              {selectedSport.subdivisions.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSubdivisionId(sub.id)}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition-all cursor-pointer ${subdivisionId === sub.id ? "bg-pink-600/20 border-pink-500 text-pink-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)] hover:border-pink-500"}`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date & Time */}
        <div className="grid grid-cols-3 gap-3">
          <Input label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="col-span-1" />
          <Input label="Start *" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          <Input label="End *" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>

        {/* Location */}
        <Input label="Location Name *" value={locationName} onChange={(e) => setLocationName(e.target.value)} required placeholder="e.g. Morley Field Pickleball Courts" />
        <Input label="Google Maps Link (optional)" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} type="url" placeholder="https://maps.google.com/..." />

        {/* Player caps */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Soft Cap (desired)"
              type="number"
              min="2"
              value={softCap}
              onChange={(e) => setSoftCap(e.target.value)}
              hint="Ideal number of players"
            />
            <Input
              label="Hard Cap (max)"
              type="number"
              min="2"
              value={hardCap}
              onChange={(e) => setHardCap(e.target.value)}
              hint="Locks lobby when reached"
              placeholder="Optional"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowOverflow}
              onChange={(e) => setAllowOverflow(e.target.checked)}
              className="accent-teal-500 w-4 h-4"
            />
            <div>
              <span className="text-sm text-[var(--foreground)]">Allow overflow players</span>
              <p className="text-xs text-[var(--muted)]">King of the court style rotation</p>
            </div>
          </label>
          {allowOverflow && (
            <Input label="Overflow notes" value={overflowNotes} onChange={(e) => setOverflowNotes(e.target.value)} placeholder="e.g. We'll do king of the court, rotate every 2 games" />
          )}
        </div>

        {/* Skill filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--muted-light)]">Minimum skill level</label>
          <div className="flex gap-2 flex-wrap">
            {["", "beginner", "intermediate", "advanced"].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setMinSkillLevel(lvl)}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-all cursor-pointer ${minSkillLevel === lvl ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)]"}`}
              >
                {lvl === "" ? "Any skill" : lvl.charAt(0).toUpperCase() + lvl.slice(1) + "+"}
              </button>
            ))}
          </div>
          {minSkillLevel && (
            <Input
              label="Relax skill filter after"
              type="date"
              value={skillFilterUntil}
              onChange={(e) => setSkillFilterUntil(e.target.value)}
              hint="Open to all skill levels after this date if not full"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--muted-light)]">Notes for players (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Bring your own paddle. Street parking on Oak St."
            className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none transition-colors resize-none"
          />
        </div>

        <Button type="submit" variant="squad" size="lg" className="w-full" loading={loading}>
          🎮 Launch Lobby
        </Button>
      </form>
    </div>
  );
}
