"use client";
import { useState, useMemo } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

interface Friend { id: string; username: string; first_name?: string }
interface SentInvite { username: string; first_name?: string }

interface Props {
  groupId: string;
  friends: Friend[];
  memberUserIds: string[];
}

export function GroupInvitePanel({ groupId, friends, memberUserIds }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentInvite[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  // Friends not yet in the group
  const availableFriends = useMemo(
    () => friends.filter((f) => !memberUserIds.includes(f.id) && !sentIds.has(f.id)),
    [friends, memberUserIds, sentIds]
  );

  // Filter by typed username
  const filteredFriends = username.trim()
    ? availableFriends.filter((f) =>
        f.username?.toLowerCase().includes(username.toLowerCase()) ||
        f.first_name?.toLowerCase().includes(username.toLowerCase())
      )
    : availableFriends;

  async function sendInvite(target?: string) {
    const u = (target ?? username).trim();
    if (!u) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/groups/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: groupId, username: u }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to send invite");
      return;
    }

    setSent((prev) => [...prev, data.invitee]);
    if (data.invitee?.id) setSentIds((prev) => new Set([...prev, data.invitee.id]));
    if (!target) setUsername("");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Invite to Group</h2>

      {/* Username search input */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by @username or name…"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendInvite(); } }}
          className="flex-1"
        />
        <Button onClick={() => sendInvite()} loading={loading} variant="secondary" size="md">
          Invite
        </Button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Friends list — filtered by search */}
      {availableFriends.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-[var(--muted)] font-medium uppercase tracking-wider">
            {username.trim() ? "Matching friends" : "Friends not yet in group"}
          </p>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {filteredFriends.length > 0 ? filteredFriends.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-teal-600/20 flex items-center justify-center text-xs font-bold text-teal-400">
                    {f.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">@{f.username}</p>
                    {f.first_name && <p className="text-xs text-[var(--muted)]">{f.first_name}</p>}
                  </div>
                </div>
                <Button
                  onClick={() => sendInvite(f.username)}
                  loading={loading}
                  variant="ghost"
                  size="sm"
                  className="text-teal-400 hover:text-teal-300 text-xs"
                >
                  + Add
                </Button>
              </div>
            )) : (
              <p className="text-xs text-[var(--muted)] px-1">No matching friends found.</p>
            )}
          </div>
        </div>
      )}

      {/* Sent confirmations */}
      {sent.length > 0 && (
        <div className="space-y-1">
          {sent.map((s, i) => (
            <p key={i} className="text-xs text-teal-400">
              ✓ Added @{s.username}{s.first_name ? ` (${s.first_name})` : ""}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
