"use client";
import { useState, useMemo } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

interface Friend { id: string; username: string; first_name?: string }
interface GroupMember { id: string; username: string; first_name?: string }
interface Group { id: string; name: string; sport_id: string; members: GroupMember[] }
interface SentInvite { username: string; first_name?: string }

const UNAVAILABLE_CAP = 4;

interface Props {
  lobbyId: string;
  friends: Friend[];
  memberUserIds: string[];
  myGroups?: Group[];
  availableUserIds?: string[];
}

export function InvitePanel({ lobbyId, friends, memberUserIds, myGroups = [], availableUserIds = [] }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentInvite[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [unavailableInvited, setUnavailableInvited] = useState(0);

  const availableSet = useMemo(() => new Set(availableUserIds), [availableUserIds]);

  const availableFriends = useMemo(
    () => friends.filter((f) => !memberUserIds.includes(f.id) && !sentIds.has(f.id)),
    [friends, memberUserIds, sentIds]
  );

  const filteredFriends = username.trim()
    ? availableFriends.filter((f) =>
        f.username?.toLowerCase().includes(username.toLowerCase()) ||
        f.first_name?.toLowerCase().includes(username.toLowerCase())
      )
    : availableFriends;

  const selectedGroup = myGroups.find((g) => g.id === selectedGroupId);
  const groupMembers = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.members.filter(
      (m) => !memberUserIds.includes(m.id) && !sentIds.has(m.id)
    );
  }, [selectedGroup, memberUserIds, sentIds]);

  const filteredGroupMembers = username.trim()
    ? groupMembers.filter((m) =>
        m.username?.toLowerCase().includes(username.toLowerCase()) ||
        m.first_name?.toLowerCase().includes(username.toLowerCase())
      )
    : groupMembers;

  async function sendInvite(target?: string) {
    const u = (target ?? username).trim();
    if (!u) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/lobbies/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lobby_id: lobbyId, username: u }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to send invite");
      return;
    }

    setSent((prev) => [...prev, data.invitee]);
    if (data.invitee?.id) {
      setSentIds((prev) => new Set([...prev, data.invitee.id]));
      if (!data.invitee.isAvailable) setUnavailableInvited((n) => n + 1);
    }
    if (!target) setUsername("");
  }

  function MemberRow({ id, username: uname, first_name }: GroupMember | Friend) {
    const isAvailable = availableSet.has(id);
    const cappedOut = !isAvailable && unavailableInvited >= UNAVAILABLE_CAP;
    return (
      <div key={id} className="flex items-center justify-between bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-teal-600/20 flex items-center justify-center text-xs font-bold text-teal-400">
            {uname?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">@{uname}</p>
            <p className="text-xs text-[var(--muted)]">
              {first_name && <span>{first_name} · </span>}
              {isAvailable
                ? <span className="text-teal-400">✓ Available</span>
                : <span className="text-yellow-500">Not marked available</span>}
            </p>
          </div>
        </div>
        <Button
          onClick={() => !cappedOut && sendInvite(uname)}
          loading={loading}
          disabled={cappedOut}
          variant="ghost"
          size="sm"
          className={cappedOut ? "text-[var(--muted)] cursor-not-allowed text-xs" : "text-teal-400 hover:text-teal-300 text-xs"}
        >
          + Invite
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Invite Players</h2>

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

      {unavailableInvited > 0 && (
        <p className={`text-xs ${unavailableInvited >= UNAVAILABLE_CAP ? "text-red-400" : "text-yellow-500"}`}>
          {unavailableInvited >= UNAVAILABLE_CAP
            ? `Limit reached: you've invited ${UNAVAILABLE_CAP} people who haven't marked this time available.`
            : `${unavailableInvited} / ${UNAVAILABLE_CAP} invites used for people not marked available.`}
        </p>
      )}

      {/* Friends section */}
      {availableFriends.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-[var(--muted)] font-medium uppercase tracking-wider">
            Friends
          </p>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {filteredFriends.length > 0 ? filteredFriends.map((f) => (
              <MemberRow key={f.id} {...f} />
            )) : username.trim() ? (
              <p className="text-xs text-[var(--muted)] px-1">No matching friends found.</p>
            ) : null}
          </div>
        </div>
      )}

      {/* Group members section */}
      {myGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--muted)] font-medium uppercase tracking-wider">
            From Your Groups
          </p>
          <select
            value={selectedGroupId}
            onChange={(e) => { setSelectedGroupId(e.target.value); setUsername(""); }}
            className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-teal-500"
          >
            <option value="">Select a group…</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          {selectedGroup && (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {filteredGroupMembers.length > 0 ? filteredGroupMembers.map((m) => (
                <MemberRow key={m.id} {...m} />
              )) : (
                <p className="text-xs text-[var(--muted)] px-1">
                  {username.trim() ? "No matching members found." : "All members are already in this lobby."}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {sent.length > 0 && (
        <div className="space-y-1">
          {sent.map((s, i) => (
            <p key={i} className="text-xs text-teal-400">
              ✓ Invite sent to @{s.username}{s.first_name ? ` (${s.first_name})` : ""}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
