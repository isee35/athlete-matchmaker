"use client";
export const dynamic = "force-dynamic";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

function OnboardingInner() {
  const [step, setStep] = useState<"profile" | "consent">("profile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectAfter = searchParams.get("redirect") ?? "";
  const supabase = createClient();

  const [username, setUsername]   = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [city, setCity]           = useState("");
  const [state, setState]         = useState("");
  const [dob, setDob]             = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [dobError, setDobError]   = useState("");

  // Minor consent
  const [parentName, setParentName]   = useState("");
  const [parentEmail, setParentEmail] = useState("");

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
    if (getAge(dob) < 18) { setStep("consent"); return; }
    await saveAndContinue();
  }

  async function handleConsentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parentName.trim() || !parentEmail.trim()) { setError("Parent name and email are required."); return; }
    setError("");
    await saveAndContinue();
  }

  async function saveAndContinue() {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in."); setLoading(false); return; }

    const age = getAge(dob);
    const isMinor = age < 18;

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      username,
      first_name: firstName,
      last_name: lastName,
      city,
      state,
      onboarding_complete: true,
      is_minor: isMinor,
      age_verified: !isMinor,
      parental_consent_pending: isMinor,
      parent_email: isMinor ? parentEmail.trim() : null,
    }, { onConflict: "id" });
    if (profileError) { setError(profileError.message); setLoading(false); return; }

    await supabase.from("profiles_private").upsert({
      user_id: user.id,
      dob: dob || null,
    });

    if (isMinor && parentEmail.trim()) {
      const token = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await supabase.from("parental_consents").insert({
        user_id: user.id,
        token,
        parent_email: parentEmail.trim(),
        parent_name: parentName.trim() || null,
      });
    }

    await supabase.from("notification_preferences").insert({ user_id: user.id });

    router.push(redirectAfter || "/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="max-w-lg mx-auto space-y-8">
        <div className="text-center space-y-1">
          <span className="text-2xl font-black gradient-text">Athlete Matchmaker</span>
          <p className="text-sm text-[var(--muted)]">
            {redirectAfter ? "Create your free account to mark your availability." : "Let's set up your profile."}
          </p>
        </div>

        {/* Profile step */}
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
                hint="Used for age verification. Not shown publicly."
              />
              {dobError === "under_16" && (
                <div className="mt-3 bg-red-950 border border-red-700 rounded-xl p-4 space-y-2">
                  <p className="text-red-400 font-bold text-sm">⛔ Access Denied</p>
                  <p className="text-sm text-red-300">
                    <strong>Athlete Matchmaker is for athletes 16 and older.</strong>
                  </p>
                </div>
              )}
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={!!usernameError || !username || dobError === "under_16"} loading={loading}>
              Create account →
            </Button>
          </form>
        )}

        {/* Parental consent step */}
        {step === "consent" && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold">Parental Consent Required</h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                Athlete Matchmaker requires parental consent for athletes ages 16–17.
              </p>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3 text-sm text-yellow-300">
              ⚠️ Your account will be created but remain <strong>inactive</strong> until a parent or guardian approves it via email.
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
                hint="We'll send a one-click approval link."
              />
              <div className="flex gap-3">
                <Button variant="ghost" type="button" onClick={() => setStep("profile")} className="flex-1">← Back</Button>
                <Button type="submit" className="flex-1" loading={loading}>Continue →</Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Onboarding() {
  return <Suspense><OnboardingInner /></Suspense>;
}
