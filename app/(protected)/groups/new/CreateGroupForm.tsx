"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SPORTS } from "@/lib/sports";

export function CreateGroupForm() {
  const [name, setName]             = useState("");
  const [sportId, setSportId]       = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !sportId) { setError("Group name and sport are required."); return; }
    setLoading(true);
    setError(null);
    setUpgradeMsg(null);

    const res = await fetch("/api/groups/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), sport_id: sportId, description: description.trim() || null, is_public: isPublic }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (data.error === "UPGRADE_REQUIRED") { setUpgradeMsg(data.message); return; }
      setError(data.error ?? "Failed to create group.");
      return;
    }

    window.location.href = `/groups/${data.group_id}`;
  }

  if (upgradeMsg) {
    return (
      <div className="space-y-5">
        <div className="bg-[var(--surface)] border border-yellow-600/30 rounded-2xl p-6 space-y-4 text-center">
          <p className="text-3xl">🔒</p>
          <p className="font-bold text-lg">Upgrade to create groups</p>
          <p className="text-sm text-[var(--muted-light)]">{upgradeMsg}</p>
          <Link href="/billing">
            <Button variant="squad" className="w-full">View Plans</Button>
          </Link>
          <button onClick={() => setUpgradeMsg(null)} className="text-xs text-[var(--muted)] hover:text-[var(--muted-light)] cursor-pointer">
            ← Back
          </button>
        </div>
      </div>
    );
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
        <label className="text-sm font-medium text-[var(--muted-light)]">
          Description <span className="text-[var(--muted)] font-normal">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this group for?"
          rows={3}
          className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none transition-colors resize-none"
        />
      </div>

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
