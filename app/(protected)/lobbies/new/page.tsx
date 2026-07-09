"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SPORTS, SPORT_CATEGORIES, getSportsByCategory } from "@/lib/sports";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

const MAX_DATE_DAYS = 60;

function maxDate() {
  const d = new Date();
  d.setDate(d.getDate() + MAX_DATE_DAYS);
  return d.toISOString().split("T")[0];
}

function minDate() {
  return new Date().toISOString().split("T")[0];
}

export default function NewLobby() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill from match notification (?date=YYYY-MM-DD&sport=pickleball&match=1)
  const matchDate  = searchParams.get("date") ?? "";
  const matchSport = searchParams.get("sport") ?? "";
  const fromMatch  = searchParams.get("match") === "1";

  // Core fields
  const [isCustom, setIsCustom]         = useState(false);
  const [customTitle, setCustomTitle]   = useState("");
  const [customDesc, setCustomDesc]     = useState("");
  const [parentSportId, setParentSportId] = useState("");
  const [title, setTitle]               = useState("");
  const [sportId, setSportId]           = useState(matchSport);
  const [subdivisionId, setSubdivisionId] = useState("");
  const [date, setDate]                 = useState(matchDate);
  const [startTime, setStartTime]       = useState("");
  const [endTime, setEndTime]           = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationUrl, setLocationUrl]   = useState("");
  const [softCap, setSoftCap]           = useState("4");
  const [hardCap, setHardCap]           = useState("");
  const [hasWaitlist, setHasWaitlist]   = useState(true);
  const [allowOverflow, setAllowOverflow] = useState(false);
  const [overflowNotes, setOverflowNotes] = useState("");
  const [minSkillLevel, setMinSkillLevel] = useState("");
  const [skillFilterUntil, setSkillFilterUntil] = useState("");
  const [notes, setNotes]               = useState("");
  const [isPrivate, setIsPrivate]       = useState(false);

  // Cost
  const [hasCost, setHasCost]           = useState(false);
  const [estimatedCost, setEstimatedCost] = useState("");
  const [costDescription, setCostDescription] = useState("");

  const selectedSport = SPORTS.find((s) => s.id === sportId);
  const hardCapNum = hardCap ? parseInt(hardCap) : null;
  const needsApproval = hardCapNum !== null && hardCapNum > 25;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isCustom && !sportId) { setError("Select a sport."); return; }
    if (isCustom && !parentSportId) { setError("Select a parent sport category for your custom lobby."); return; }

    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in."); setLoading(false); return; }

    const lobbyTitle = isCustom ? customTitle : title;

    const { data, error: lobbyError } = await supabase.from("lobbies").insert({
      owner_id: user.id,
      title: lobbyTitle,
      sport_id: isCustom ? parentSportId : sportId,
      subdivision_id: isCustom ? null : (subdivisionId || null),
      is_custom: isCustom,
      custom_title: isCustom ? customTitle : null,
      custom_description: isCustom ? customDesc : null,
      parent_sport_id: isCustom ? parentSportId : null,
      date,
      start_time: startTime,
      end_time: endTime,
      location_name: locationName,
      location_url: locationUrl || null,
      soft_cap: parseInt(softCap),
      hard_cap: hardCapNum,
      has_waitlist: hasWaitlist,
      allow_overflow: allowOverflow,
      overflow_notes: overflowNotes || null,
      min_skill_level: minSkillLevel || null,
      skill_filter_until: skillFilterUntil || null,
      notes: notes || null,
      is_private: isPrivate,
      has_cost: hasCost,
      estimated_cost: hasCost && estimatedCost ? parseFloat(estimatedCost) : null,
      cost_description: hasCost ? costDescription || null : null,
      pending_approval: needsApproval,
    }).select("id").single();

    if (lobbyError) {
      setError(`Could not create lobby: ${lobbyError.message || lobbyError.code || JSON.stringify(lobbyError)}`);
      setLoading(false);
      return;
    }

    if (!data?.id) {
      setError("Lobby was not created — no ID returned. Please try again.");
      setLoading(false);
      return;
    }

    // Auto-join as owner
    await supabase.from("lobby_members").insert({ lobby_id: data.id, user_id: user.id });

    // If created from a match notification, ping the other matched users
    if (fromMatch && matchDate && (sportId || parentSportId)) {
      await fetch("/api/lobbies/notify-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lobbyId: data.id,
          date: matchDate,
          sportId: sportId || parentSportId,
        }),
      });
    }

    router.push(`/lobbies/${data.id}`);
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-black">Create a Lobby</h1>
        <p className="text-sm text-[var(--muted-light)] mt-1">Rally your squad for a game.</p>
      </div>

      {/* Custom lobby toggle */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setIsCustom(false)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${!isCustom ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)]"}`}>
          Pick a Sport
        </button>
        <button type="button" onClick={() => setIsCustom(true)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${isCustom ? "bg-pink-600/20 border-pink-500 text-pink-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)]"}`}>
          ✨ Custom Lobby
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {fromMatch && (
        <div className="text-sm text-teal-300 bg-teal-900/20 border border-teal-800 rounded-xl px-4 py-3">
          🎯 You were matched with a group available on this date. The date and sport are pre-filled — finish creating the lobby and they'll be notified instantly.
        </div>
      )}
      {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">{error}</p>}
        {needsApproval && (
          <div className="text-sm text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded-xl px-4 py-3">
            ⚠️ Lobbies with more than 25 players require admin approval before going live.
          </div>
        )}

        {isCustom ? (
          <div className="space-y-4">
            <Input label="Lobby Title *" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} required placeholder="e.g. Sunday Frisbee + Hangout" />
            <div>
              <label className="text-sm font-medium text-[var(--muted-light)]">Description *</label>
              <textarea value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} rows={3} required
                placeholder="Tell people what this is about..."
                className="w-full mt-1 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none transition-colors resize-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--muted-light)]">Closest sport category *</label>
              <select
                value={parentSportId}
                onChange={(e) => setParentSportId(e.target.value)}
                required
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-teal-500"
              >
                <option value="">— select category —</option>
                {SPORT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.emoji} {cat.label}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <>
            <Input label="Lobby Title *" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Sunday Pickleball at Morley" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--muted-light)]">Sport *</label>
                <select
                  value={sportId}
                  onChange={(e) => { setSportId(e.target.value); setSubdivisionId(""); }}
                  required
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-teal-500"
                >
                  <option value="">— select sport —</option>
                  {SPORT_CATEGORIES.map((cat) => {
                    const sports = getSportsByCategory(cat.id);
                    return (
                      <optgroup key={cat.id} label={`${cat.emoji} ${cat.label}`}>
                        {sports.map((s) => (
                          <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
              {selectedSport && selectedSport.subdivisions.length > 0 && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--muted-light)]">Format</label>
                  <select
                    value={subdivisionId}
                    onChange={(e) => setSubdivisionId(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-teal-500"
                  >
                    <option value="">— any format —</option>
                    {selectedSport.subdivisions.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </>
        )}

        {/* Date & Time */}
        <div className="grid grid-cols-3 gap-3">
          <Input label={`Date * (max ${MAX_DATE_DAYS}d)`} type="date" value={date} min={minDate()} max={maxDate()} onChange={(e) => setDate(e.target.value)} required />
          <Input label="Start *" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          <Input label="End *" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>

        {/* Location */}
        <Input label="Location Name *" value={locationName} onChange={(e) => setLocationName(e.target.value)} required placeholder="e.g. Morley Field Pickleball Courts" />
        <Input label="Google Maps Link (optional)" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} type="url" placeholder="https://maps.google.com/..." />

        {/* Player caps & waitlist */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Soft Cap (desired)" type="number" min="2" value={softCap} onChange={(e) => setSoftCap(e.target.value)} hint="Ideal number of players" />
            <Input label="Hard Cap (max)" type="number" min="2" value={hardCap} onChange={(e) => setHardCap(e.target.value)} hint="Locks when reached" placeholder="Optional" />
          </div>
          {hardCap && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={hasWaitlist} onChange={(e) => setHasWaitlist(e.target.checked)} className="accent-teal-500 w-4 h-4 mt-0.5" />
              <div>
                <span className="text-sm text-[var(--foreground)]">Enable waitlist</span>
                <p className="text-xs text-[var(--muted)]">If off, lobby hard-caps with no overflow queue. Players may miss out if someone bails.</p>
              </div>
            </label>
          )}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={allowOverflow} onChange={(e) => setAllowOverflow(e.target.checked)} className="accent-teal-500 w-4 h-4" />
            <div>
              <span className="text-sm text-[var(--foreground)]">Allow overflow players</span>
              <p className="text-xs text-[var(--muted)]">King of the court style rotation</p>
            </div>
          </label>
          {allowOverflow && <Input label="Overflow notes" value={overflowNotes} onChange={(e) => setOverflowNotes(e.target.value)} placeholder="e.g. Rotate every 2 games" />}
        </div>

        {/* Cost */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={hasCost} onChange={(e) => setHasCost(e.target.checked)} className="accent-teal-500 w-4 h-4" />
            <div>
              <span className="text-sm text-[var(--foreground)]">This lobby has a cost</span>
              <p className="text-xs text-[var(--muted)]">Court fees, equipment, etc. — players pay directly.</p>
            </div>
          </label>
          {hasCost && (
            <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              <Input label="Estimated cost per person ($)" type="number" min="0" step="0.01" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="e.g. 5.00" />
              <Input label="Cost details" value={costDescription} onChange={(e) => setCostDescription(e.target.value)} placeholder="e.g. $5 court fee payable at the front desk" />
            </div>
          )}
        </div>

        {/* Privacy */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="accent-teal-500 w-4 h-4" />
          <div>
            <span className="text-sm text-[var(--foreground)]">Private lobby</span>
            <p className="text-xs text-[var(--muted)]">Only people you invite can see and join this lobby.</p>
          </div>
        </label>

        {/* Skill filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--muted-light)]">Minimum skill level</label>
          <div className="flex gap-2 flex-wrap">
            {["", "beginner", "intermediate", "advanced"].map((lvl) => (
              <button key={lvl} type="button" onClick={() => setMinSkillLevel(lvl)}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-all cursor-pointer ${minSkillLevel === lvl ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)]"}`}>
                {lvl === "" ? "Any skill" : lvl.charAt(0).toUpperCase() + lvl.slice(1) + "+"}
              </button>
            ))}
          </div>
          {minSkillLevel && (
            <Input label="Relax skill filter after" type="date" value={skillFilterUntil} onChange={(e) => setSkillFilterUntil(e.target.value)} hint="Open to all after this date if not full" />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--muted-light)]">Notes for players (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Bring your own paddle. Street parking on Oak St."
            className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none transition-colors resize-none" />
        </div>

        <Button type="submit" variant="squad" size="lg" className="w-full" loading={loading}>
          🎮 Launch Lobby
        </Button>
      </form>
    </div>
  );
}
