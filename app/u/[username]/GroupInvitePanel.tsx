"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SPORTS } from "@/lib/sports";

interface Group { id: string; name: string; sport_id: string | null }

interface Props {
  targetUserId: string;
  targetUsername: string;
}

export function GroupInvitePanel({ targetUserId, targetUsername }: Props) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [mode, setMode] = useState<"pick" | "create">("pick");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [sportId, setSportId] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!open) return;
    async function loadGroups() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Get groups where user is owner or captain
      const { data } = await supabase
        .from("group_members")
        .select("group_id, role, groups(id, name, sport_id)")
        .eq("user_id", user.id)
        .in("role", ["owner", "captain"]);
      const gs: Group[] = [];
      for (const row of (data ?? []) as any[]) {
        if (row.groups) gs.push({ id: row.groups.id, name: row.groups.name, sport_id: row.groups.sport_id });
      }
      setGroups(gs);
      if (gs.length === 0) setMode("create");
    }
    loadGroups();
  }, [open]);

  async function submit() {
    setLoading(true);
    setError(null);
    const body: Record<string, string> = { target_user_id: targetUserId };
    if (mode === "pick") {
      if (!selectedGroupId) { setError("Select a group."); setLoading(false); return; }
      body.group_id = selectedGroupId;
    } else {
      if (!newGroupName.trim()) { setError("Enter a group name."); setLoading(false); return; }
      body.new_group_name = newGroupName.trim();
      if (sportId) body.sport_id = sportId;
    }

    const res = await fetch("/api/groups/invite-from-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
    setDone(true);
  }

  if (done) {
    return (
      <p className="text-xs text-teal-400 text-center py-2">
        ✓ @{targetUsername} added to {mode === "pick" ? "group" : `"${newGroupName}"`}!
      </p>
    );
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm" className="w-full">
        👥 Invite to Group
      </Button>
    );
  }

  return (
    <div className="space-y-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Invite @{targetUsername} to a group</p>
        <button onClick={() => setOpen(false)} className="text-[var(--muted)] hover:text-[var(--foreground)] text-lg leading-none">×</button>
      </div>

      {/* Mode tabs — only show if user has groups they can manage */}
      {groups.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode("pick")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${mode === "pick" ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted-light)]"}`}
          >
            Add to existing group
          </button>
          <button
            onClick={() => setMode("create")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${mode === "create" ? "bg-pink-600/20 border-pink-500 text-pink-300" : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted-light)]"}`}
          >
            Create new group
          </button>
        </div>
      )}

      {mode === "pick" && groups.length > 0 && (
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-teal-500"
        >
          <option value="">Select a group…</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      )}

      {mode === "create" && (
        <div className="space-y-2">
          <Input
            placeholder="Group name (e.g. Sunday Pickleball Crew)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <select
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-teal-500"
          >
            <option value="">Sport (optional)</option>
            {SPORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <Button onClick={submit} loading={loading} variant="squad" size="sm" className="w-full">
        {mode === "pick" ? "Add to Group" : "Create Group & Add"}
      </Button>
    </div>
  );
}
