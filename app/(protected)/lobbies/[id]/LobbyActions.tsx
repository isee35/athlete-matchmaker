"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

interface Props {
  lobby: any;
  myMembership: any;
  myInvite: any;
  isOwner: boolean;
  isFull: boolean;
  joinedCount: number;
  waitlistCount: number;
  userId: string;
}

export function LobbyActions({ lobby, myMembership, myInvite, isOwner, isFull, joinedCount, waitlistCount, userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [contactOptIn, setContactOptIn] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function squadUp() {
    setLoading(true);
    const isWaitlist = isFull && waitlistCount < lobby.waitlist_max;
    if (isWaitlist) {
      await supabase.from("lobby_members").insert({
        lobby_id: lobby.id,
        user_id: userId,
        status: "waitlisted",
        waitlist_position: waitlistCount + 1,
        contact_opt_in: contactOptIn,
      });
    } else {
      await supabase.from("lobby_members").insert({
        lobby_id: lobby.id,
        user_id: userId,
        status: "joined",
      });
      // Check if we hit the hard cap
      const newCount = joinedCount + 1;
      const hardCap = lobby.hard_cap ?? lobby.soft_cap;
      if (newCount >= hardCap) {
        await supabase.from("lobbies").update({ status: "locked" }).eq("id", lobby.id);
      } else if (newCount >= lobby.soft_cap) {
        await supabase.from("lobbies").update({ status: "full" }).eq("id", lobby.id);
      }
    }
    router.refresh();
    setLoading(false);
  }

  async function leavelobby() {
    setLoading(true);
    await supabase.from("lobby_members").delete().eq("lobby_id", lobby.id).eq("user_id", userId);
    // Reopen if was locked/full
    if (lobby.status === "locked" || lobby.status === "full") {
      await supabase.from("lobbies").update({ status: "open" }).eq("id", lobby.id);
    }
    router.refresh();
    setLoading(false);
  }

  async function lockLobby() {
    setLoading(true);
    await supabase.from("lobbies").update({ status: "locked" }).eq("id", lobby.id);
    router.refresh();
    setLoading(false);
  }

  async function cancelLobby() {
    if (!confirm("Cancel this lobby? This cannot be undone.")) return;
    setLoading(true);
    await supabase.from("lobbies").update({ status: "cancelled" }).eq("id", lobby.id);
    router.refresh();
    setLoading(false);
  }

  if (lobby.status === "cancelled") {
    return <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-400">This lobby has been cancelled.</div>;
  }
  if (lobby.status === "completed") {
    return <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--muted)]">This game has been completed.</div>;
  }

  const canWaitlist = isFull && waitlistCount < (lobby.waitlist_max ?? 2);

  async function acceptInvite(inviteId: string) {
    setLoading(true);
    await supabase.from("lobby_invites").update({ status: "accepted" }).eq("id", inviteId);
    await supabase.from("lobby_members").insert({ lobby_id: lobby.id, user_id: userId, status: "joined" });
    router.refresh();
    setLoading(false);
  }

  async function declineInvite(inviteId: string) {
    setLoading(true);
    await supabase.from("lobby_invites").update({ status: "declined" }).eq("id", inviteId);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      {myInvite?.status === "pending" && !myMembership && (
        <div className="bg-teal-900/20 border border-teal-600/40 rounded-xl px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-teal-300">🎮 You&apos;ve been invited to join this lobby!</p>
          <div className="flex gap-2">
            <Button onClick={() => acceptInvite(myInvite.id)} loading={loading} variant="squad" size="md" className="flex-1">
              Accept
            </Button>
            <Button onClick={() => declineInvite(myInvite.id)} loading={loading} variant="ghost" size="md">
              Decline
            </Button>
          </div>
        </div>
      )}

      {!myMembership && (
        <>
          {canWaitlist && (
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-yellow-300">This lobby is full — join the waitlist</p>
              <label className="flex items-center gap-2 text-sm text-[var(--muted-light)] cursor-pointer">
                <input type="checkbox" checked={contactOptIn} onChange={(e) => setContactOptIn(e.target.checked)} className="accent-yellow-500" />
                Allow the host to contact me directly if a spot opens
              </label>
              <Button onClick={squadUp} loading={loading} variant="secondary" className="w-full border-yellow-700/50">
                Join Waitlist #{waitlistCount + 1}
              </Button>
            </div>
          )}
          {!isFull && (
            <Button onClick={squadUp} loading={loading} variant="squad" size="lg" className="w-full text-base">
              🎮 Squad Up
            </Button>
          )}
          {isFull && !canWaitlist && (
            <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--muted)] text-center">
              Lobby is locked — waitlist is full.
            </div>
          )}
        </>
      )}

      {myMembership?.status === "joined" && !isOwner && (
        <Button onClick={leavelobby} loading={loading} variant="danger" size="md">
          Leave lobby
        </Button>
      )}

      {myMembership?.status === "waitlisted" && (
        <div className="flex items-center justify-between bg-yellow-900/20 border border-yellow-700/50 rounded-xl px-4 py-3">
          <p className="text-sm text-yellow-300">You&apos;re on the waitlist (#{myMembership.waitlist_position})</p>
          <Button onClick={leavelobby} loading={loading} variant="ghost" size="sm">Leave</Button>
        </div>
      )}

      {isOwner && lobby.status === "open" && (
        <div className="flex gap-3">
          <Button onClick={lockLobby} loading={loading} variant="secondary" size="md">
            🔒 Lock lobby
          </Button>
          <Button onClick={cancelLobby} loading={loading} variant="danger" size="md">
            Cancel
          </Button>
        </div>
      )}

      {isOwner && lobby.status === "locked" && (
        <Button onClick={cancelLobby} loading={loading} variant="danger" size="sm">
          Cancel lobby
        </Button>
      )}
    </div>
  );
}
