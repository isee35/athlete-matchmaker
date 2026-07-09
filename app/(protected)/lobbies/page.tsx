import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card } from "@/components/Card";

export const dynamic = "force-dynamic";
import { getSportById, SPORT_CATEGORIES } from "@/lib/sports";

export default async function Lobbies({ searchParams }: { searchParams: Promise<{ sport?: string; status?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("lobbies")
    .select("*, profiles(username), lobby_members(count)")
    .order("date")
    .order("start_time");

  if (params.sport) query = query.eq("sport_id", params.sport);
  if (params.status === "waitlisted") {
    query = query.eq("status", "locked");
  } else {
    query = query.in("status", ["open", "full"]);
  }

  const { data: lobbies } = await query.limit(50);

  const statusLabel: Record<string, string> = {
    open: "Open",
    full: "Full",
    locked: "Locked",
    cancelled: "Cancelled",
    completed: "Completed",
  };
  const statusColor: Record<string, string> = {
    open: "bg-teal-600/20 text-teal-400 border-teal-600/30",
    full: "bg-pink-600/20 text-pink-400 border-pink-600/30",
    locked: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Lobbies</h1>
          <p className="text-sm text-[var(--muted-light)] mt-1">Find a game or start your own.</p>
        </div>
        <Link href="/lobbies/new" className="bg-gradient-to-r from-teal-600 to-pink-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
          + Create
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/lobbies"
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${!params.sport && !params.status ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)] hover:border-teal-600"}`}
        >
          All Open
        </Link>
        <Link
          href="/lobbies?status=waitlisted"
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${params.status === "waitlisted" ? "bg-yellow-600/20 border-yellow-500 text-yellow-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)] hover:border-yellow-600"}`}
        >
          Waitlist Available
        </Link>
        {SPORT_CATEGORIES.map((cat) => (
          <Link
            key={cat.id}
            href={`/lobbies?sport=${cat.id}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${params.sport === cat.id ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)] hover:border-teal-600"}`}
          >
            {cat.emoji} {cat.label}
          </Link>
        ))}
      </div>

      {/* Lobby cards */}
      {lobbies && lobbies.length > 0 ? (
        <div className="space-y-3">
          {lobbies.map((lobby: any) => {
            const sport = getSportById(lobby.sport_id);
            const memberCount = lobby.lobby_members?.[0]?.count ?? 0;
            const isFull = lobby.status === "full" || lobby.status === "locked";
            return (
              <Link key={lobby.id} href={`/lobbies/${lobby.id}`}>
                <Card className="hover:border-teal-600/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl mt-0.5">{sport?.emoji ?? "🏅"}</span>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{lobby.title}</p>
                          <span className={`text-xs border px-2 py-0.5 rounded-full ${statusColor[lobby.status] ?? "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"}`}>
                            {statusLabel[lobby.status]}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted-light)]">
                          {sport?.label}{lobby.subdivision_id && ` · ${lobby.subdivision_id}`} · {lobby.date} · {lobby.start_time?.slice(0,5)}–{lobby.end_time?.slice(0,5)}
                        </p>
                        <p className="text-xs text-[var(--muted)]">📍 {lobby.location_name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          Hosted by <span className="text-teal-400">@{lobby.profiles?.username}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold ${isFull ? "text-pink-400" : "text-teal-400"}`}>
                        {memberCount}/{lobby.hard_cap ?? lobby.soft_cap}
                      </div>
                      <div className="text-xs text-[var(--muted)]">players</div>
                      {lobby.min_skill_level && (
                        <div className="text-xs text-[var(--muted)] mt-1">{lobby.min_skill_level}+</div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12 space-y-3">
          <p className="text-3xl">🏅</p>
          <p className="text-[var(--muted-light)]">No open lobbies right now.</p>
          <p className="text-sm text-[var(--muted)]">Be the first — create one and rally your squad.</p>
          <Link href="/lobbies/new" className="inline-block text-sm bg-gradient-to-r from-teal-600 to-pink-600 text-white px-5 py-2 rounded-xl font-medium">
            + Create a Lobby
          </Link>
        </Card>
      )}
    </div>
  );
}
