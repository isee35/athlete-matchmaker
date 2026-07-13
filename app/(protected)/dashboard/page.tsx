import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card } from "@/components/Card";
import { CalendarView } from "@/components/CalendarView";
import { getSportById, SPORTS } from "@/lib/sports";

export const dynamic = "force-dynamic";

// Build emoji + color maps from SPORTS data once
const SPORT_EMOJIS: Record<string, string> = {};
const SPORT_COLORS: Record<string, string> = {};
SPORTS.forEach((s) => {
  SPORT_EMOJIS[s.id] = s.emoji;
  SPORT_COLORS[s.id] = "teal";
});

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);
  const monthStart = `${currentMonth}-01`;
  const monthEnd = new Date(
    parseInt(currentMonth.split("-")[0]),
    parseInt(currentMonth.split("-")[1]),
    0
  ).toISOString().split("T")[0];

  const [
    { data: profile },
    { data: notifications },
    { data: userSports },
    { data: joinedLobbies },
    { data: ownedGroups },
    { data: membershipRows },
  ] = await Promise.all([
    supabase.from("profiles").select("username, first_name, no_show_count, lobby_count").eq("id", user!.id).single(),
    supabase.from("notifications").select("id").eq("user_id", user!.id).eq("read", false),
    supabase.from("user_sports").select("sport_id, skill_level, skill_rating").eq("user_id", user!.id),
    supabase.from("lobby_members")
      .select("lobby_id, lobbies(id, title, sport_id, date, time, status)")
      .eq("user_id", user!.id)
      .eq("status", "joined")
      .gte("lobbies.date", today)
      .limit(5),
    supabase.from("groups").select("id, name, sport_id").eq("owner_id", user!.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("group_members").select("group_id, groups(id, name, sport_id, owner_id)").eq("user_id", user!.id).neq("role", "owner"),
  ]);

  const memberGroups = (membershipRows ?? [])
    .map((r: any) => r.groups)
    .filter(Boolean)
    .filter((g: any) => g.owner_id !== user!.id);

  const myGroups = [
    ...(ownedGroups ?? []).map((g: any) => ({ ...g, isOwner: true })),
    ...memberGroups.map((g: any) => ({ ...g, isOwner: false })),
  ].slice(0, 6);

  const name = profile?.first_name ?? profile?.username ?? "Athlete";
  const unread = notifications?.length ?? 0;
  const sportIds = (userSports ?? []).map((s: any) => s.sport_id);

  // Fetch this month's lobby data server-side for initial render
  let calendarQuery = supabase
    .from("lobbies")
    .select("id, title, sport_id, date, time, location, max_players, current_players, status, is_private, pending_approval")
    .gte("date", monthStart)
    .lte("date", monthEnd)
    .eq("status", "open")
    .eq("pending_approval", false)
    .order("date")
    .order("time");

  if (sportIds.length > 0) {
    calendarQuery = calendarQuery.in("sport_id", sportIds);
  }

  const { data: calendarLobbies } = await calendarQuery;

  const byDate: Record<string, any[]> = {};
  (calendarLobbies ?? []).forEach((lobby) => {
    if (!byDate[lobby.date]) byDate[lobby.date] = [];
    byDate[lobby.date].push(lobby);
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
      {/* Greeting + quick stats */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">
            Hey, <span className="gradient-text">{name} 👋</span>
          </h1>
          <p className="text-sm text-[var(--muted-light)] mt-0.5">Here&apos;s what&apos;s happening this month.</p>
        </div>
        <Link
          href="/lobbies/new"
          className="shrink-0 bg-gradient-to-r from-teal-600 to-pink-600 text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity text-sm"
        >
          + Create Lobby
        </Link>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Sports", value: userSports?.length ?? 0, icon: "🏅" },
          { label: "Joined", value: profile?.lobby_count ?? 0, icon: "✅" },
          { label: "Upcoming", value: joinedLobbies?.filter((m: any) => m.lobbies).length ?? 0, icon: "📅" },
          { label: "Alerts", value: unread, icon: "🔔", href: "/notifications", highlight: unread > 0 },
        ].map(({ label, value, icon, href, highlight }) => {
          const inner = (
            <Card className={`text-center py-3 ${highlight ? "border-pink-600/50" : ""}`}>
              <div className="text-xl">{icon}</div>
              <div className={`text-xl font-bold mt-0.5 ${highlight ? "text-pink-400" : ""}`}>{value}</div>
              <div className="text-[10px] text-[var(--muted)] mt-0.5">{label}</div>
            </Card>
          );
          return href ? <Link key={label} href={href}>{inner}</Link> : <div key={label}>{inner}</div>;
        })}
      </div>

      {/* Your upcoming games */}
      {(joinedLobbies ?? []).filter((m: any) => m.lobbies).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Your upcoming games</h2>
            <Link href="/lobbies" className="text-xs text-teal-400 hover:text-teal-300">View all →</Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(joinedLobbies ?? []).filter((m: any) => m.lobbies).map((m: any) => {
              const lobby = m.lobbies;
              const sport = getSportById(lobby.sport_id);
              return (
                <Link key={lobby.id} href={`/lobbies/${lobby.id}`} className="shrink-0">
                  <div className="bg-[var(--surface)] border border-teal-600/30 rounded-xl px-4 py-3 hover:border-teal-500 transition-colors min-w-[160px]">
                    <div className="text-xl">{sport?.emoji ?? "🏅"}</div>
                    <p className="text-sm font-medium mt-1 truncate max-w-[140px]">{lobby.title}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{lobby.date}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Your Groups */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Your Groups</h2>
          <Link href="/groups" className="text-xs text-teal-400 hover:text-teal-300">View all →</Link>
        </div>
        {myGroups.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {myGroups.map((group: any) => {
              const sport = getSportById(group.sport_id);
              return (
                <Link key={group.id} href={`/groups/${group.id}`} className="shrink-0">
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 hover:border-teal-600/50 transition-colors min-w-[140px]">
                    <div className="text-xl">{sport?.emoji ?? "👥"}</div>
                    <p className="text-sm font-medium mt-1 truncate max-w-[120px]">{group.name}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{group.isOwner ? "Owner" : "Member"}</p>
                  </div>
                </Link>
              );
            })}
            <Link href="/groups/new" className="shrink-0">
              <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-xl px-4 py-3 hover:border-teal-600/50 transition-colors min-w-[120px] flex flex-col items-center justify-center gap-1 h-full">
                <span className="text-xl">+</span>
                <p className="text-xs text-[var(--muted)]">New Group</p>
              </div>
            </Link>
          </div>
        ) : (
          <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-xl px-4 py-4 flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">No groups yet — create one to schedule with friends.</p>
            <Link href="/groups/new" className="text-xs text-teal-400 hover:text-teal-300 shrink-0 ml-3">Create →</Link>
          </div>
        )}
      </div>

      {/* Main calendar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">
            {sportIds.length > 0 ? "Events in your sports" : "All open lobbies"}
          </h2>
          {sportIds.length === 0 && (
            <Link href="/profile" className="text-xs text-teal-400 hover:text-teal-300">Add sports →</Link>
          )}
        </div>
        <CalendarView
          initialMonth={currentMonth}
          initialData={byDate}
          userSportIds={sportIds}
          sportEmojis={SPORT_EMOJIS}
          sportColors={SPORT_COLORS}
        />
      </div>
    </div>
  );
}
