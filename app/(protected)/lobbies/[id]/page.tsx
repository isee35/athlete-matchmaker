import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import { getSportById } from "@/lib/sports";
import { LobbyActions } from "./LobbyActions";
import { LobbyChat } from "./LobbyChat";
import { NoShowButton } from "./NoShowButton";
import { Card } from "@/components/Card";
import Link from "next/link";

export default async function LobbyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) notFound();

  const { data: lobby, error: lobbyErr } = await supabase
    .from("lobbies")
    .select("*, profiles(username, first_name)")
    .eq("id", id)
    .single();

  if (!lobby) {
    console.error("Lobby not found:", id, lobbyErr?.message);
    notFound();
  }

  const { data: members } = await supabase
    .from("lobby_members")
    .select("*, profiles(username, first_name, last_name, city)")
    .eq("lobby_id", id)
    .order("joined_at");

  const sport = getSportById(lobby.sport_id);
  const joined = members?.filter((m: any) => m.status === "joined") ?? [];
  const waitlisted = members?.filter((m: any) => m.status === "waitlisted") ?? [];
  const myMembership = members?.find((m: any) => m.user_id === user?.id);
  const isOwner = lobby.owner_id === user?.id;
  const hardCap = lobby.hard_cap ?? lobby.soft_cap;
  const isFull = joined.length >= hardCap;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-4xl">{sport?.emoji ?? "🏅"}</span>
            <div>
              <h1 className="text-xl font-black">{lobby.title}</h1>
              <p className="text-sm text-[var(--muted-light)]">
                {sport?.label}{lobby.subdivision_id && ` · ${lobby.subdivision_id}`}
              </p>
            </div>
          </div>
          <span className={`text-xs border px-3 py-1 rounded-full shrink-0 ${
            lobby.status === "open" ? "bg-teal-600/20 text-teal-400 border-teal-600/30" :
            lobby.status === "full" ? "bg-pink-600/20 text-pink-400 border-pink-600/30" :
            lobby.status === "locked" ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/30" :
            "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"
          }`}>
            {lobby.status.charAt(0).toUpperCase() + lobby.status.slice(1)}
          </span>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <Card className="space-y-1">
            <p className="text-xs text-[var(--muted)]">📅 Date &amp; Time</p>
            <p className="font-medium text-sm">{lobby.date}</p>
            <p className="text-sm text-[var(--muted-light)]">{lobby.start_time?.slice(0,5)} – {lobby.end_time?.slice(0,5)}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs text-[var(--muted)]">📍 Location</p>
            <p className="font-medium text-sm">{lobby.location_name}</p>
            {lobby.location_url && (
              <a href={lobby.location_url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-400 hover:text-teal-300">
                View on Google Maps →
              </a>
            )}
          </Card>
          <Card className="space-y-1">
            <p className="text-xs text-[var(--muted)]">👥 Players</p>
            <p className="font-medium text-sm">{joined.length} / {hardCap}</p>
            {lobby.soft_cap !== hardCap && (
              <p className="text-xs text-[var(--muted)]">Soft cap: {lobby.soft_cap}</p>
            )}
            {lobby.allow_overflow && (
              <p className="text-xs text-pink-400">Overflow allowed 🔄</p>
            )}
          </Card>
          <Card className="space-y-1">
            <p className="text-xs text-[var(--muted)]">🏅 Skill</p>
            <p className="font-medium text-sm">{lobby.min_skill_level ? `${lobby.min_skill_level}+` : "All welcome"}</p>
            {lobby.skill_filter_until && (
              <p className="text-xs text-[var(--muted)]">Relaxes after {lobby.skill_filter_until}</p>
            )}
          </Card>
        </div>

        {lobby.notes && (
          <Card>
            <p className="text-xs text-[var(--muted)] mb-1">📝 Notes from host</p>
            <p className="text-sm text-[var(--muted-light)]">{lobby.notes}</p>
          </Card>
        )}
        {lobby.overflow_notes && (
          <Card>
            <p className="text-xs text-[var(--muted)] mb-1">🔄 Overflow / rotation info</p>
            <p className="text-sm text-[var(--muted-light)]">{lobby.overflow_notes}</p>
          </Card>
        )}

        <p className="text-xs text-[var(--muted)]">
          Hosted by <Link href={`/u/${lobby.profiles?.username}`} className="text-teal-400">@{lobby.profiles?.username}</Link>
        </p>
      </div>

      {/* Squad Up / actions */}
      <LobbyActions
        lobby={lobby}
        myMembership={myMembership}
        isOwner={isOwner}
        isFull={isFull}
        joinedCount={joined.length}
        waitlistCount={waitlisted.length}
        userId={user?.id ?? ""}
      />

      {/* Members */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Squad ({joined.length})</h2>
        <div className="space-y-2">
          {joined.map((m: any) => (
            <div key={m.user_id} className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-600/20 flex items-center justify-center text-sm font-bold text-teal-400">
                  {m.profiles?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">@{m.profiles?.username}</p>
                  {m.profiles?.city && <p className="text-xs text-[var(--muted)]">{m.profiles.city}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.user_id === lobby.owner_id && (
                  <span className="text-xs bg-pink-600/20 text-pink-400 border border-pink-600/30 px-2 py-0.5 rounded-full">Host</span>
                )}
                {/* No-show button: only shown after event date, only to other members, not self */}
                {user && m.user_id !== user.id && myMembership?.status === "joined" && lobby.date < new Date().toISOString().split("T")[0] && (
                  <NoShowButton lobbyId={id} reportedUserId={m.user_id} reportedUsername={m.profiles?.username} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Waitlist */}
      {waitlisted.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--muted-light)]">Waitlist ({waitlisted.length})</h2>
          <div className="space-y-2">
            {waitlisted.map((m: any) => (
              <div key={m.user_id} className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 opacity-75">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center text-sm font-bold text-yellow-400">
                    {m.profiles?.username?.[0]?.toUpperCase()}
                  </div>
                  <p className="text-sm font-medium">@{m.profiles?.username}</p>
                </div>
                <span className="text-xs text-yellow-400">#{m.waitlist_position}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat — only for joined members */}
      {myMembership?.status === "joined" && (
        <LobbyChat lobbyId={id} userId={user?.id ?? ""} />
      )}
    </div>
  );
}
