"use client";
export const dynamic = "force-dynamic";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SPORTS, SPORT_CATEGORIES, getSportsByCategory } from "@/lib/sports";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

type Step = "profile" | "consent" | "sports" | "skills" | "availability";

interface UserSportSelection {
  sportId: string;
  subdivisionIds: string[];
  skillType: string;
  skillLevel?: string;
  skillRating?: string;
  skillVerified: boolean;
  notifyAllAlt: boolean;
}

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

interface AvailSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
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
  const [dob, setDob]             = useState("");
  const [phone, setPhone]         = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [dobError, setDobError]   = useState("");

  // Step 2 — Sports selection
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [sportSubdivisions, setSportSubdivisions] = useState<Record<string, string[]>>({});

  // Step 3 — Skills
  const [skillSelections, setSkillSelections] = useState<Record<string, UserSportSelection>>({});

  // Parental consent (minors 16-17)
  const [parentName, setParentName]     = useState("");
  const [parentEmail, setParentEmail]   = useState("");
  const [consentSubmitted, setConsentSubmitted] = useState(false);

  // Step 4 — Availability
  const [availSlots, setAvailSlots] = useState<AvailSlot[]>([]);

  async function checkUsername(val: string) {
    if (val.length < 3) { setUsernameError("Must be at least 3 characters"); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) { setUsernameError("Letters, numbers, and underscores only"); return; }
    const { data } = await supabase.from("profiles").select("id").eq("username", val).single();
    setUsernameError(data ? "Username is taken" : "");
  }

  function getAge(val: string): number {
    const birth = new Date(val);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  }

  function validateDob(val: string): string {
    if (!val) return "Date of birth is required";
    const age = getAge(val);
    if (age < 16) return "under_16";
    if (age > 120) return "Invalid date of birth";
    return "";
  }

  async function handleProfileNext(e: React.FormEvent) {
    e.preventDefault();
    if (usernameError) return;
    if (!firstName.trim()) { setError("First name is required"); return; }
    if (!lastName.trim()) { setError("Last name is required"); return; }
    if (!city.trim() || !state.trim()) { setError("City and state are required"); return; }
    const dobErr = validateDob(dob);
    if (dobErr === "under_16") { setDobError("under_16"); return; }
    if (dobErr) { setDobError(dobErr); return; }
    setError("");
    setDobError("");
    // Check if 16-17 (minor needing parental consent)
    const age = getAge(dob);
    if (age < 18) {
      setStep("consent");
      return;
    }
    setStep("sports");
  }

  async function handleConsentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parentName.trim() || !parentEmail.trim()) { setError("Parent name and email are required."); return; }
    setError("");
    setConsentSubmitted(true);
    // Proceed to sports selection — account will be flagged as pending consent after final submit
    setStep("sports");
  }

  function selectAllSports() {
    const allIds = SPORTS.map((s) => s.id);
    setSelectedSports(allIds);
    const allSubs: Record<string, string[]> = {};
    SPORTS.forEach((s) => {
      allSubs[s.id] = s.subdivisions.map((sub) => sub.id);
    });
    setSportSubdivisions(allSubs);
  }

  function toggleSport(sportId: string) {
    setSelectedSports((prev) => {
      const next = prev.includes(sportId) ? prev.filter((s) => s !== sportId) : [...prev, sportId];
      return next;
    });
    // Default all subdivisions when sport is first selected
    if (!selectedSports.includes(sportId)) {
      const sport = SPORTS.find((s) => s.id === sportId);
      if (sport && sport.subdivisions.length > 0) {
        setSportSubdivisions((prev) => ({
          ...prev,
          [sportId]: sport.subdivisions.map((sub) => sub.id),
        }));
      }
    }
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

  function addAvailSlot() {
    setAvailSlots((prev) => [...prev, { dayOfWeek: 0, startTime: "09:00", endTime: "12:00" }]);
  }

  function removeAvailSlot(i: number) {
    setAvailSlots((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateAvailSlot(i: number, patch: Partial<AvailSlot>) {
    setAvailSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  }

  async function handleFinish() {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in."); setLoading(false); return; }

    const age = (() => {
      const birth = new Date(dob);
      const now = new Date();
      let a = now.getFullYear() - birth.getFullYear();
      if (now.getMonth() - birth.getMonth() < 0 || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) a--;
      return a;
    })();

    const age = getAge(dob);
    const isMinor = age < 18;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      username,
      first_name: firstName,
      last_name: lastName,
      city,
      state,
      dob,
      phone: phone.trim() || null,
      onboarding_complete: true,
      is_minor: isMinor,
      age_verified: !isMinor,
      parental_consent_pending: isMinor,
      parent_email: isMinor ? parentEmail.trim() : null,
    });
    if (profileError) { setError(profileError.message); setLoading(false); return; }

    // Create parental consent record for minors
    if (isMinor && parentEmail.trim()) {
      const token = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await supabase.from("parental_consents").insert({
        user_id: user.id,
        token,
        parent_email: parentEmail.trim(),
        parent_name: parentName.trim() || null,
      });
      // In production: trigger an email to parentEmail with /consent?token=<token>
    }

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

    if (availSlots.length > 0) {
      const availRows = availSlots.map((slot) => ({
        user_id: user.id,
        day_of_week: slot.dayOfWeek,
        start_time: slot.startTime,
        end_time: slot.endTime,
        sport_ids: selectedSports,
      }));
      await supabase.from("availability_recurring").insert(availRows);
    }

    await supabase.from("notification_preferences").insert({ user_id: user.id });

    router.push("/dashboard");
    router.refresh();
  }

  const steps: Step[] = ["profile", "sports", "skills", "availability"];
  const stepLabels = ["Your info", "Sports", "Skill levels", "Availability"];
  const effectiveStep = step === "consent" ? "profile" : step;
  const stepIndex = steps.indexOf(effectiveStep);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-1">
          <span className="text-2xl font-black gradient-text">Athlete Matchmaker</span>
          <p className="text-sm text-[var(--muted)]">Let&apos;s set up your athlete profile</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center gap-1.5 ${i <= stepIndex ? "text-teal-400" : "text-[var(--muted)]"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border flex-shrink-0 ${i < stepIndex ? "bg-teal-600 border-teal-600 text-white" : i === stepIndex ? "border-teal-500 text-teal-400" : "border-[var(--border)] text-[var(--muted)]"}`}>
                  {i < stepIndex ? "✓" : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block whitespace-nowrap">{label}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-px ${i < stepIndex ? "bg-teal-600" : "bg-[var(--border)]"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Profile */}
        {step === "profile" && (
          <form onSubmit={handleProfileNext} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold">Your info</h2>
            {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}
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
              <Input label="First Name *" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Bryce" required />
              <Input label="Last Name *" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Clifford" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="City *" value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Diego" required />
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--foreground)]">State *</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-teal-500"
                >
                  <option value="">— select —</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Input
                label="Date of Birth *"
                type="date"
                value={dob}
                onChange={(e) => { setDob(e.target.value); setDobError(validateDob(e.target.value)); }}
                required
                error={dobError !== "under_16" ? dobError : undefined}
                hint="Used for age-appropriate matching. Not shown publicly."
              />
              {dobError === "under_16" && (
                <div className="mt-3 bg-red-950 border border-red-700 rounded-xl p-4 space-y-2">
                  <p className="text-red-400 font-bold text-sm">⛔ Access Denied</p>
                  <p className="text-sm text-red-300">
                    <strong>Athlete Matchmaker is for athletes 16 and older.</strong> Falsifying this information could result in serious penalties and permanent account termination.
                  </p>
                  <p className="text-xs text-red-400/70">
                    If you believe you have reached this message in error, please contact support.
                  </p>
                </div>
              )}
            </div>
            <div>
              <Input
                label="Mobile Phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(619) 555-0100"
                hint="Optional. Private — only used for event contact and waitlist notifications."
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={!!usernameError || !username || dobError === "under_16"}>Continue →</Button>
          </form>
        )}

        {/* Parental consent step */}
        {step === "consent" && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold">Parental Consent Required</h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                Athlete Matchmaker requires parental consent for athletes ages 16–17. We&apos;ll send an email to your parent or guardian to approve your account.
              </p>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3 text-sm text-yellow-300">
              ⚠️ Your account will be created but will remain <strong>inactive</strong> until your parent or guardian approves it via email. This usually takes just a few minutes.
            </div>
            {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}
            <form onSubmit={handleConsentSubmit} className="space-y-4">
              <Input
                label="Parent / Guardian Full Name *"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                required
                placeholder="Jane Clifford"
              />
              <Input
                label="Parent / Guardian Email *"
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                required
                placeholder="parent@email.com"
                hint="We'll send a one-click approval link. Their email is never made public."
              />
              <p className="text-xs text-[var(--muted)]">
                By continuing, you confirm that you are 16 or 17 years old and that the contact information above belongs to your parent or legal guardian.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" type="button" onClick={() => setStep("profile")} className="flex-1">← Back</Button>
                <Button type="submit" className="flex-1">Continue →</Button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Sports */}
        {step === "sports" && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold">What sports do you play?</h2>
              <p className="text-sm text-[var(--muted)] mt-1">Select everything you&apos;re interested in — you can always add more later.</p>
            </div>
            {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}
            {/* "Play anything" button */}
            <button
              type="button"
              onClick={selectAllSports}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-teal-600/60 text-teal-400 text-sm font-semibold hover:border-teal-500 hover:bg-teal-600/10 transition-all cursor-pointer"
            >
              🎯 I&apos;ll play anything — notify me when fun things are happening!
            </button>
            <div className="space-y-5">
              {SPORT_CATEGORIES.map((cat) => {
                const sports = getSportsByCategory(cat.id);
                return (
                  <div key={cat.id}>
                    <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">{cat.emoji} {cat.label}</p>
                    {cat.id === "alternative" && (
                      <p className="text-xs text-pink-400 mb-2">Selecting any alternative sport will notify you for all alternative sport lobbies.</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {sports.map((sport) => {
                        const selected = selectedSports.includes(sport.id);
                        return (
                          <div key={sport.id} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => toggleSport(sport.id)}
                              className={`w-full px-3 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer text-left ${selected ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)] hover:border-teal-600"}`}
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
                          <button key={lvl} type="button"
                            onClick={() => updateSkill(sportId, { skillLevel: lvl === "i_don_t_know" ? undefined : lvl })}
                            className={`px-3 py-1.5 rounded-xl text-sm border transition-all cursor-pointer capitalize ${(sel.skillLevel === lvl || (lvl === "i_don_t_know" && !sel.skillLevel)) ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)]"}`}>
                            {lvl === "i_don_t_know" ? "I don't know" : lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                    {(sport.skillType === "numeric_golf" || sport.skillType === "numeric_rating") && (
                      <div className="space-y-3">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Input label={sport.skillLabel ?? "Rating"} type="number" step="0.1"
                              value={sel.skillRating ?? ""} onChange={(e) => updateSkill(sportId, { skillRating: e.target.value })}
                              placeholder={sport.skillType === "numeric_golf" ? "e.g. 12.4" : "e.g. 4.2"} />
                          </div>
                          {sel.skillRating && (
                            <label className="flex items-center gap-2 text-sm text-[var(--muted-light)] cursor-pointer pb-2.5">
                              <input type="checkbox" checked={sel.skillVerified} onChange={(e) => updateSkill(sportId, { skillVerified: e.target.checked })} className="accent-teal-500" />
                              {sport.skillVerifiedLabel ?? "Verified"}
                            </label>
                          )}
                        </div>
                        {!sel.skillRating && (
                          <div>
                            <p className="text-xs text-[var(--muted)] mb-2">Or if you don&apos;t have a rating:</p>
                            <div className="flex gap-2 flex-wrap">
                              {["beginner", "intermediate", "advanced"].map((lvl) => (
                                <button key={lvl} type="button" onClick={() => updateSkill(sportId, { skillLevel: lvl })}
                                  className={`px-3 py-1.5 rounded-xl text-sm border transition-all cursor-pointer ${sel.skillLevel === lvl ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)]"}`}>
                                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep("sports")} className="flex-1">← Back</Button>
              <Button onClick={() => setStep("availability")} className="flex-1">Continue →</Button>
            </div>
          </div>
        )}

        {/* Step 4: Availability */}
        {step === "availability" && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold">When are you usually available?</h2>
              <p className="text-sm text-[var(--muted)] mt-1">Helps us surface lobbies that fit your schedule. You can update this anytime.</p>
            </div>
            {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              {availSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2 bg-[var(--surface-2)] rounded-xl p-3">
                  <select
                    value={slot.dayOfWeek}
                    onChange={(e) => updateAvailSlot(i, { dayOfWeek: parseInt(e.target.value) })}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-teal-500"
                  >
                    {DAYS.map((d, idx) => <option key={d} value={idx}>{d}</option>)}
                  </select>
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateAvailSlot(i, { startTime: e.target.value })}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-[var(--muted)] text-xs">to</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateAvailSlot(i, { endTime: e.target.value })}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-teal-500"
                  />
                  <button type="button" onClick={() => removeAvailSlot(i)} className="ml-auto text-[var(--muted)] hover:text-red-400 text-lg leading-none cursor-pointer">×</button>
                </div>
              ))}
              <button type="button" onClick={addAvailSlot}
                className="w-full py-2 px-4 rounded-xl border border-dashed border-[var(--border)] text-[var(--muted)] text-sm hover:border-teal-600 hover:text-teal-400 transition-all cursor-pointer">
                + Add time slot
              </button>
            </div>
            <p className="text-xs text-[var(--muted)]">No slots? No problem — you can add availability from your profile later.</p>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep("skills")} className="flex-1">← Back</Button>
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
