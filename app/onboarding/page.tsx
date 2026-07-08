"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SPORTS, SPORT_CATEGORIES, getSportsByCategory } from "@/lib/sports";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

type Step = "profile" | "sports" | "skills";

interface UserSportSelection {
  sportId: string;
  subdivisionIds: string[];
  skillType: string;
  skillLevel?: string;
  skillRating?: string;
  skillVerified: boolean;
  notifyAllAlt: boolean;
}

export default function Onboarding() {
  const [step, setStep] = useState<Step>("profile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Step 1 — Profile
  const [username, setUsername]   = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [city, setCity]           = useState("");
  const [state, setState]         = useState("");
  const [usernameError, setUsernameError] = useState("");

  // Step 2 — Sports selection
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [sportSubdivisions, setSportSubdivisions] = useState<Record<string, string[]>>({});

  // Step 3 — Skills
  const [skillSelections, setSkillSelections] = useState<Record<string, UserSportSelection>>({});

  async function checkUsername(val: string) {
    if (val.length < 3) { setUsernameError("Must be at least 3 characters"); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) { setUsernameError("Letters, numbers, and underscores only"); return; }
    const { data } = await supabase.from("profiles").select("id").eq("username", val).single();
    setUsernameError(data ? "Username is taken" : "");
  }

  async function handleProfileNext(e: React.FormEvent) {
    e.preventDefault();
    if (usernameError) return;
    setStep("sports");
  }

  function toggleSport(sportId: string) {
    setSelectedSports((prev) =>
      prev.includes(sportId) ? prev.filter((s) => s !== sportId) : [...prev, sportId]
    );
  }

  function toggleSubdivision(sportId: string, subId: string) {
    setSportSubdivisions((prev) => {
      const current = prev[sportId] ?? [];
      return {
        ...prev,
        [sportId]: current.includes(subId) ? current.filter((s) => s !== subId) : [...current, subId],
      };
    });
  }

  function handleSportsNext() {
    if (selectedSports.length === 0) { setError("Select at least one sport."); return; }
    setError("");
    // Initialize skill selections
    const initial: Record<string, UserSportSelection> = {};
    selectedSports.forEach((sportId) => {
      const sport = SPORTS.find((s) => s.id === sportId)!;
      initial[sportId] = {
        sportId,
        subdivisionIds: sportSubdivisions[sportId] ?? [],
        skillType: sport.skillType,
        skillLevel: undefined,
        skillRating: undefined,
        skillVerified: false,
        notifyAllAlt: sport.category === "alternative",
      };
    });
    setSkillSelections(initial);
    setStep("skills");
  }

  function updateSkill(sportId: string, patch: Partial<UserSportSelection>) {
    setSkillSelections((prev) => ({ ...prev, [sportId]: { ...prev[sportId], ...patch } }));
  }

  async function handleFinish() {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in."); setLoading(false); return; }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      username,
      first_name: firstName || null,
      last_name: lastName || null,
      city: city || null,
      state: state || null,
    });
    if (profileError) { setError(profileError.message); setLoading(false); return; }

    const sportsRows = Object.values(skillSelections).map((s) => ({
      user_id: user.id,
      sport_id: s.sportId,
      subdivision_ids: s.subdivisionIds,
      skill_type: s.skillType,
      skill_level: s.skillLevel ?? null,
      skill_rating: s.skillRating ? parseFloat(s.skillRating) : null,
      skill_verified: s.skillVerified,
      notify_all_alt: s.notifyAllAlt,
    }));

    const { error: sportsError } = await supabase.from("user_sports").insert(sportsRows);
    if (sportsError) { setError(sportsError.message); setLoading(false); return; }

    // Create default notification preferences
    await supabase.from("notification_preferences").insert({ user_id: user.id });

    router.push("/dashboard");
    router.refresh();
  }

  const steps = ["profile", "sports", "skills"];
  const stepIndex = steps.indexOf(step);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-1">
          <span className="text-2xl font-black gradient-text">Athlete Matchmaker</span>
          <p className="text-sm text-[var(--muted)]">Let&apos;s set up your athlete profile</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {["Your info", "Sports", "Skill levels"].map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${i <= stepIndex ? "text-teal-400" : "text-[var(--muted)]"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${i < stepIndex ? "bg-teal-600 border-teal-600 text-white" : i === stepIndex ? "border-teal-500 text-teal-400" : "border-[var(--border)] text-[var(--muted)]"}`}>
                  {i < stepIndex ? "✓" : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block">{label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-px ${i < stepIndex ? "bg-teal-600" : "bg-[var(--border)]"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Profile */}
        {step === "profile" && (
          <form onSubmit={handleProfileNext} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold">Your info</h2>
            <Input
              label="Username *"
              value={username}
              onChange={(e) => { setUsername(e.target.value); checkUsername(e.target.value); }}
              required
              placeholder="e.g. pickleking99"
              error={usernameError}
              hint="Public-facing. Letters, numbers, underscores."
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Bryce" />
              <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Clifford" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Diego" />
              <Input label="State" value={state} onChange={(e) => setState(e.target.value)} placeholder="CA" />
            </div>
            <p className="text-xs text-[var(--muted)]">Location helps us match you with nearby athletes when regional filtering launches.</p>
            <Button type="submit" size="lg" className="w-full" disabled={!!usernameError || !username}>Continue →</Button>
          </form>
        )}

        {/* Step 2: Sports */}
        {step === "sports" && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold">What sports do you play?</h2>
              <p className="text-sm text-[var(--muted)] mt-1">Select everything you&apos;re interested in — you can always add more later.</p>
            </div>
            {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-5">
              {SPORT_CATEGORIES.map((cat) => {
                const sports = getSportsByCategory(cat.id);
                return (
                  <div key={cat.id}>
                    <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">{cat.emoji} {cat.label}</p>
                    {cat.id === "alternative" && (
                      <p className="text-xs text-pink-400 mb-2">Selecting any alternative sport will notify you for all alternative sport lobbies.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {sports.map((sport) => {
                        const selected = selectedSports.includes(sport.id);
                        return (
                          <div key={sport.id} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => toggleSport(sport.id)}
                              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all cursor-pointer ${selected ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)] hover:border-teal-600"}`}
                            >
                              {sport.emoji} {sport.label}
                            </button>
                            {selected && sport.subdivisions.length > 0 && (
                              <div className="flex flex-wrap gap-1 pl-1">
                                {sport.subdivisions.map((sub) => {
                                  const subSelected = (sportSubdivisions[sport.id] ?? []).includes(sub.id);
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => toggleSubdivision(sport.id, sub.id)}
                                      className={`px-2 py-0.5 rounded-lg text-xs border transition-all cursor-pointer ${subSelected ? "bg-pink-600/20 border-pink-500 text-pink-300" : "bg-[var(--surface-3)] border-[var(--border)] text-[var(--muted)] hover:border-pink-500"}`}
                                    >
                                      {sub.label}
                                    </button>
                                  );
                                })}
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
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep("profile")} className="flex-1">← Back</Button>
              <Button onClick={handleSportsNext} className="flex-1">Continue →</Button>
            </div>
          </div>
        )}

        {/* Step 3: Skill levels */}
        {step === "skills" && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold">Your skill levels</h2>
              <p className="text-sm text-[var(--muted)] mt-1">This helps lobby owners find the right match-ups.</p>
            </div>
            {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-5">
              {selectedSports.map((sportId) => {
                const sport = SPORTS.find((s) => s.id === sportId)!;
                const sel = skillSelections[sportId];
                if (!sel) return null;
                return (
                  <div key={sportId} className="border border-[var(--border)] rounded-xl p-4 space-y-3">
                    <p className="font-medium">{sport.emoji} {sport.label}</p>

                    {sport.skillType === "baa" && (
                      <div className="flex gap-2 flex-wrap">
                        {["beginner", "intermediate", "advanced", "i_don_t_know"].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => updateSkill(sportId, { skillLevel: lvl === "i_don_t_know" ? undefined : lvl })}
                            className={`px-3 py-1.5 rounded-xl text-sm border transition-all cursor-pointer capitalize ${(sel.skillLevel === lvl || (lvl === "i_don_t_know" && !sel.skillLevel)) ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)]"}`}
                          >
                            {lvl === "i_don_t_know" ? "I don't know" : lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}

                    {(sport.skillType === "numeric_golf" || sport.skillType === "numeric_rating") && (
                      <div className="space-y-3">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Input
                              label={sport.skillLabel ?? "Rating"}
                              type="number"
                              step="0.1"
                              value={sel.skillRating ?? ""}
                              onChange={(e) => updateSkill(sportId, { skillRating: e.target.value })}
                              placeholder={sport.skillType === "numeric_golf" ? "e.g. 12.4" : "e.g. 4.2"}
                            />
                          </div>
                          {sel.skillRating && (
                            <label className="flex items-center gap-2 text-sm text-[var(--muted-light)] cursor-pointer pb-2.5">
                              <input
                                type="checkbox"
                                checked={sel.skillVerified}
                                onChange={(e) => updateSkill(sportId, { skillVerified: e.target.checked })}
                                className="accent-teal-500"
                              />
                              {sport.skillVerifiedLabel ?? "Verified"}
                            </label>
                          )}
                        </div>
                        {!sel.skillRating && (
                          <div>
                            <p className="text-xs text-[var(--muted)] mb-2">Or if you don&apos;t have a rating:</p>
                            <div className="flex gap-2 flex-wrap">
                              {["beginner", "intermediate", "advanced"].map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => updateSkill(sportId, { skillLevel: lvl })}
                                  className={`px-3 py-1.5 rounded-xl text-sm border transition-all cursor-pointer ${sel.skillLevel === lvl ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)]"}`}
                                >
                                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {sport.skillType === "numeric_golf" && !sel.skillRating && (
                          <p className="text-xs text-[var(--muted)]">Average score? Enter it above — we&apos;ll use it for rough matching.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep("sports")} className="flex-1">← Back</Button>
              <Button variant="squad" size="lg" onClick={handleFinish} loading={loading} className="flex-1">
                Let&apos;s go! 🏆
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
