import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card } from "@/components/Card";
import { getSportById } from "@/lib/sports";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: myLobbies }, { data: joinedLobbies }, { data: notifications }, { data: userSports }] = await Promise.all([
    supabase.from("profiles").select("username, first_name, no_show_count").eq("id", user!.id).single(),
    supabase.from("lobbies").select("*, lobby_members(count)").eq("owner_id", user!.id).eq("status", "open").order("date").limit(3),
    supabase.from("lobby_members")
      .select("lobby_id, lobbies(id, title, sport_id, date, start_time, status)")
      .eq("user_id", user!.id)
      .eq("status", "joined")
      .limit(5),
    supabase.from("notifications").select("id").eq("user_id", user!.id).eq("read", false),
    supabase.from("user_sports").select("sport_id, skill_level, skill_rating").eq("user_id", user!.id),
  ]);

  const name = profile?.first_name ?? profile?.username ?? "Athlete";
  const unread = notifications?.length ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black">
          Hey, <span className="gradient-text">{name} 👋</span>
        </h1>
        <p className="text-sm text-[var(--muted-light)]">Ready to find a game? Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Sports", value: userSports?.length ?? 0, icon: "🏅" },
          { label: "My Lobbies", value: myLobbies?.length ?? 0, icon: "🎮" },
          { label: "Joined", value: joinedLobbies?.length ?? 0, icon: "✅" },
          { label: "Unread", value: unread, icon: "🔔", highlight: unread > 0 },
        ].map(({ label, value, icon, highlight }) => (
          <Card key={label} className={`text-center ${highlight ? "border-pink-600/50" : ""}`}>
            <div className="text-2xl">{icon}</div>
            <div className={`text-2xl font-bold mt-1 ${highlight ? "text-pink-400" : ""}`}>{value}</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Upcoming joined lobbies */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Your upcoming games</h2>
          <Link href="/lobbies" className="text-xs text-teal-400 hover:text-teal-300">View all →</Link>
        </div>
        {joinedLobbies && joinedLobbies.length > 0 ? (
          joinedLobbies.map((m: any) => {
            const lobby = m.lobbies;
            if (!lobby) return null;
            const sport = getSportById(lobby.sport_id);
            return (
              <Link key={lobby.id} href={`/lobbies/${lobby.id}`}>
                <Card className="flex items-center justify-between hover:border-teal-600/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{sport?.emoji ?? "🏅"}</span>
                    <div>
                      <p className="font-medium text-sm">{lobby.title}</p>
                      <p className="text-xs text-[var(--muted)]">{lobby.date} · {lobby.start_time?.slice(0,5)}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-teal-600/20 text-teal-400 border border-teal-600/30 px-2 py-0.5 rounded-full">Joined</span>
                </Card>
              </Link>
            );
          })
        ) : (
          <Card className="text-center py-8 space-y-3">
            <p className="text-[var(--muted)]">No upcoming games yet.</p>
            <Link href="/lobbies" className="inline-block text-sm bg-gradient-to-r from-teal-600 to-pink-600 text-white px-5 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity">
              Browse open lobbies
            </Link>
          </Card>
        )}
      </div>

      {/* My sports */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Your sports</h2>
          <Link href="/profile" className="text-xs text-teal-400 hover:text-teal-300">Edit profile →</Link>
        </div>
        {userSports && userSports.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {userSports.map((us: any) => {
              const sport = getSportById(us.sport_id);
              if (!sport) return null;
              return (
                <span key={us.sport_id} className="flex items-center gap-1.5 bg-[var(--surface-2)] border border-[var(--border)] px-3 py-1.5 rounded-xl text-sm">
                  {sport.emoji} {sport.label}
                  {us.skill_rating && <span className="text-teal-400 text-xs">· {us.skill_rating}</span>}
                  {us.skill_level && !us.skill_rating && <span className="text-[var(--muted)] text-xs">· {us.skill_level}</span>}
                </span>
              );
            })}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-[var(--muted)]">No sports added yet. <Link href="/profile" className="text-teal-400">Add some →</Link></p>
          </Card>
        )}
      </div>

      {/* CTA — create lobby */}
      <Card glow="teal" className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Ready to run a game?</p>
          <p className="text-sm text-[var(--muted-light)]">Create a lobby and Squad Up with local athletes.</p>
        </div>
        <Link href="/lobbies/new" className="shrink-0 bg-gradient-to-r from-teal-600 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity text-sm whitespace-nowrap">
          + Create Lobby
        </Link>
      </Card>
    </div>
  );
}
