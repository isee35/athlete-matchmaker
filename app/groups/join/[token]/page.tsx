"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getSportById } from "@/lib/sports";
import { Button } from "@/components/Button";

interface GroupInfo {
  id: string;
  name: string;
  sport_id: string | null;
  owner: { username: string; first_name: string | null };
  member_count: number;
}

export default function JoinGroupPage() {
  const { token } = useParams() as { token: string };
  const router = useRouter();
  const supabase = createClient();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      // Look up group by token (public read — no auth needed for basic info)
      const { data: g } = await supabase
        .from("groups")
        .select("id, name, sport_id, owner_id, profiles!groups_owner_id_fkey(username, first_name)")
        .eq("invite_token", token)
        .single();

      if (!g) { setLoading(false); return; }

      const { count } = await supabase
        .from("group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", g.id);

      const owner = (g as any).profiles ?? {};
      setGroup({ id: g.id, name: g.name, sport_id: g.sport_id, owner, member_count: count ?? 0 });

      if (user) {
        const { data: mem } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", g.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setAlreadyMember(!!mem);
      }

      setLoading(false);
    }
    load();
  }, [token]);

  async function handleJoin() {
    if (!currentUserId || !group) return;
    setJoining(true);
    setError(null);

    const res = await fetch("/api/groups/invites/join-by-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    setJoining(false);
    if (!res.ok) {
      setError(data.error === "UPGRADE_REQUIRED" ? data.message : data.error ?? "Something went wrong");
      return;
    }
    setDone(true);
    setTimeout(() => router.push(`/groups/${group.id}`), 1500);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--muted)] text-sm">Loading...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-3xl">🔗</p>
          <p className="text-lg font-bold">Invalid invite link</p>
          <p className="text-sm text-[var(--muted)]">This link may have expired or been reset.</p>
          <Link href="/dashboard"><Button size="sm" variant="secondary">Go home</Button></Link>
        </div>
      </div>
    );
  }

  const sport = getSportById(group.sport_id ?? "");

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Group card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-center space-y-3">
          <div className="text-5xl">{sport?.emoji ?? "👥"}</div>
          <div>
            <h1 className="text-2xl font-black">{group.name}</h1>
            {sport && <p className="text-sm text-[var(--muted)] mt-0.5">{sport.label}</p>}
          </div>
          <div className="flex justify-center gap-4 text-sm text-[var(--muted)]">
            <span>👤 {group.member_count} member{group.member_count !== 1 ? "s" : ""}</span>
            <span>· Hosted by @{group.owner.username}</span>
          </div>
        </div>

        {done ? (
          <div className="text-center space-y-2">
            <p className="text-2xl">🎉</p>
            <p className="font-bold text-teal-400">You joined {group.name}!</p>
            <p className="text-sm text-[var(--muted)]">Redirecting to the group...</p>
          </div>
        ) : alreadyMember ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-[var(--muted)]">You&apos;re already in this group.</p>
            <Link href={`/groups/${group.id}`}><Button className="w-full">View Group</Button></Link>
          </div>
        ) : currentUserId ? (
          <div className="space-y-3">
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            <Button onClick={handleJoin} loading={joining} className="w-full">
              Join {group.name}
            </Button>
            <Link href="/dashboard" className="block text-center text-xs text-[var(--muted)] hover:text-[var(--muted-light)]">
              Cancel
            </Link>
          </div>
        ) : (
          /* Guest — prompt signup or login */
          <div className="space-y-3">
            <p className="text-sm text-center text-[var(--muted-light)]">
              Create a free account to join this group and coordinate schedules.
            </p>
            <Link href={`/auth/signup?redirect=/groups/join/${token}`}>
              <Button className="w-full">Create Free Account</Button>
            </Link>
            <Link href={`/auth/login?redirect=/groups/join/${token}`}>
              <Button variant="secondary" className="w-full">Log In</Button>
            </Link>
            <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-[var(--muted-light)]">Free account includes:</p>
              <ul className="text-xs text-[var(--muted)] space-y-0.5">
                <li>✓ View group availability</li>
                <li>✓ Mark your availability on polls</li>
                <li>✓ Join up to 3 groups</li>
                <li>✗ Create lobbies (upgrade to unlock)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
