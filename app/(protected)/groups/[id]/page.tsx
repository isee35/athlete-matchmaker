import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getSportById } from "@/lib/sports";
import { Card } from "@/components/Card";
import Link from "next/link";
import { GroupInvitePanel } from "./GroupInvitePanel";
import { GroupMemberActions } from "./GroupMemberActions";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function GroupDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .single();

  if (!group) notFound();

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, role, joined_at, profiles(username, first_name, last_name, city)")
    .eq("group_id", id)
    .order("joined_at");

  const isOwner = group.owner_id === user?.id;
  const myMembership = members?.find((m: any) => m.user_id === user?.id);
  const isCaptain = myMembership?.role === "captain";
  const canManagePoll = isOwner || isCaptain;
  const sport = getSportById(group.sport_id);

  if (!isOwner && !myMembership) notFound();

  // Fetch followers (friends) for the invite panel
  const { data: followingRows } = await supabase
    .from("followers")
    .select("following_id, profiles!following_id(username, first_name)")
    .eq("follower_id", user!.id);

  const friends = (followingRows ?? []).map((r: any) => ({
    id: r.following_id,
    username: r.profiles?.username,
    first_name: r.profiles?.first_name,
  }));

  const memberUserIds = new Set((members ?? []).map((m: any) => m.user_id));

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="space-y-1">
        <Link href="/groups" className="text-xs text-teal-400 hover:text-teal-300">← Groups</Link>
        <div className="flex items-start justify-between gap-4 mt-1">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{sport?.emoji ?? "🏅"}</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black">{group.name}</h1>
                {group.is_public ? (
                  <span className="text-xs text-[var(--muted)] border border-[var(--border)] px-2 py-0.5 rounded-full">🌐 Public</span>
                ) : (
                  <span className="text-xs text-[var(--muted)] border border-[var(--border)] px-2 py-0.5 rounded-full">🔒 Private</span>
                )}
              </div>
              <p className="text-sm text-[var(--muted-light)]">{sport?.label} · {members?.length ?? 0} member{members?.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          {isOwner && (
            <span className="text-xs bg-teal-600/20 text-teal-400 border border-teal-600/30 px-3 py-1 rounded-full shrink-0">Owner</span>
          )}
          {isCaptain && (
            <span className="text-xs bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 px-3 py-1 rounded-full shrink-0">Captain</span>
          )}
        </div>
        {group.description && (
          <p className="text-sm text-[var(--muted-light)] mt-2">{group.description}</p>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href={`/lobbies/new?group=${id}&sport=${group.sport_id}`}
          className="bg-gradient-to-r from-teal-600 to-pink-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
        >
          + Create Lobby
        </Link>
        {canManagePoll && (
          <Link
            href={`/groups/${id}/poll/new`}
            className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] px-4 py-2 rounded-xl text-sm hover:border-teal-600/50 transition-colors"
          >
            📅 Poll Availability
          </Link>
        )}
      </div>

      {/* Members list */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Squad ({members?.length ?? 0})</h2>
        <div className="space-y-2">
          {(members ?? []).map((m: any) => (
            <div key={m.user_id} className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  m.role === "owner" ? "bg-teal-600/20 text-teal-400" :
                  m.role === "captain" ? "bg-yellow-600/20 text-yellow-400" :
                  "bg-[var(--surface-2)] text-[var(--muted-light)]"
                }`}>
                  {m.profiles?.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <Link href={`/u/${m.profiles?.username}`} className="text-sm font-medium hover:text-teal-400 transition-colors">
                    @{m.profiles?.username}
                  </Link>
                  {m.profiles?.city && <p className="text-xs text-[var(--muted)]">{m.profiles.city}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.role === "owner" && (
                  <span className="text-xs bg-teal-600/20 text-teal-400 border border-teal-600/30 px-2 py-0.5 rounded-full">Owner</span>
                )}
                {m.role === "captain" && (
                  <span className="text-xs bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 px-2 py-0.5 rounded-full">Captain</span>
                )}
                {isOwner && m.user_id !== user?.id && (
                  <GroupMemberActions
                    groupId={id}
                    userId={m.user_id}
                    username={m.profiles?.username}
                    currentRole={m.role}
                    isOwnerViewing
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite panel (owner or captain) */}
      {(isOwner || isCaptain) && (
        <GroupInvitePanel groupId={id} friends={friends} memberUserIds={Array.from(memberUserIds)} />
      )}

      {/* Leave group (non-owner members) */}
      {!isOwner && myMembership && (
        <GroupMemberActions groupId={id} userId={user!.id} username={null} currentRole={myMembership.role} isSelf />
      )}
    </div>
  );
}
