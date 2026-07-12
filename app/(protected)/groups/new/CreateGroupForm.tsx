"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SPORTS } from "@/lib/sports";

export function CreateGroupForm() {
  const [name, setName] = useState("");
  const [sportId, setSportId] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !sportId) {
      setError("Group name and sport are required.");
      return;
    }
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in."); setLoading(false); return; }

    const { data: group, error: groupErr } = await supabase
      .from("groups")
      .insert({ name: name.trim(), sport_id: sportId, owner_id: user.id, description: description.trim() || null, is_public: isPublic })
      .select("id")
      .single();

    if (groupErr || !group) {
      setError(groupErr?.message ?? "Failed to create group.");
      setLoading(false);
      return;
    }

    // Auto-add owner as member with role 'owner'
    await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id, role: "owner" });

    window.location.href = `/groups/${group.id}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Group Name"
        placeholder="e.g. Buddy's Pickleball Crew"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[var(--muted-light)]">Sport</label>
        <select
          value={sportId}
          onChange={(e) => setSportId(e.target.value)}
          required
          className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none transition-colors"
        >
          <option value="">Select a sport…</option>
          {SPORTS.map((s) => (
            <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[var(--muted-light)]">Description <span className="text-[var(--muted)] font-normal">(optional)</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this group for?"
          rows={3}
          className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none transition-colors resize-none"
        />
      </div>

      {/* Public / Private toggle */}
      <div className="flex items-center justify-between bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-medium">{isPublic ? "🌐 Public group" : "🔒 Private group"}</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {isPublic ? "Anyone can discover and request to join" : "Only people you invite can see this group"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsPublic((v) => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? "bg-teal-600" : "bg-[var(--border)]"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" loading={loading} variant="squad" size="lg" className="w-full">
        Create Group
      </Button>
    </form>
  );
}
