"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

export function EditProfileForm({ profile, userSports }: { profile: any; userSports: any[] }) {
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName]   = useState(profile?.last_name ?? "");
  const [city, setCity]           = useState(profile?.city ?? "");
  const [state, setState]         = useState(profile?.state ?? "");
  const [bio, setBio]             = useState(profile?.bio ?? "");
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName, city, state, bio })
      .eq("id", profile.id);
    if (error) { setMessage(error.message); } else { setMessage("Saved!"); router.refresh(); }
    setSaving(false);
  }

  return (
    <form onSubmit={save} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
      <h2 className="text-base font-semibold">Edit info</h2>
      <div className="space-y-1">
        <label className="text-sm text-[var(--muted-light)]">Username</label>
        <p className="text-sm font-medium">@{profile?.username}</p>
        <p className="text-xs text-[var(--muted)]">Username cannot be changed after signup.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-sm text-[var(--muted-light)]">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="Tell your squad a little about yourself..."
          className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none resize-none"
        />
      </div>
      {message && <p className={`text-sm ${message === "Saved!" ? "text-teal-400" : "text-red-400"}`}>{message}</p>}
      <Button type="submit" loading={saving}>Save changes</Button>
    </form>
  );
}
