import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, region")
    .eq("id", user!.id)
    .single();

  if (!profile || !["admin", "ambassador"].includes(profile.role)) redirect("/dashboard");

  const today = new Date().toISOString().split("T")[0];

  // Daily signups last 14 days
  const { data: dailySignups } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
    .order("created_at", { ascending: true });

  // Sport interest breakdown (all user_sports)
  const { data: allSports } = await supabase
    .from("user_sports")
    .select("sport_id, skill_level, skill_rating");

  // Skill level distribution
  const { data: skillData } = await supabase
    .from("user_sports")
    .select("sport_id, skill_type, skill_level, skill_rating");

  // Geographic breakdown
  const { data: geoData } = await supabase
    .from("profiles")
    .select("city, state")
    .not("city", "is", null);

  // Lobby creation per day (last 14 days)
  const { data: lobbyCreation } = await supabase
    .from("lobbies")
    .select("created_at, sport_id, status")
    .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
    .order("created_at", { ascending: true });

  // Average sports per user
  const { count: totalSportRows } = await supabase
    .from("user_sports")
    .select("*", { count: "exact", head: true });
  const { count: totalProfiles } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const avgSportsPerUser = totalProfiles && totalSportRows
    ? (totalSportRows / totalProfiles).toFixed(1)
    : "—";

  // Tally by day
  const signupsByDay: Record<string, number> = {};
  (dailySignups ?? []).forEach((row: any) => {
    const day = row.created_at.slice(0, 10);
    signupsByDay[day] = (signupsByDay[day] ?? 0) + 1;
  });

  // Sport tally
  const sportTally: Record<string, number> = {};
  (allSports ?? []).forEach((row: any) => {
    sportTally[row.sport_id] = (sportTally[row.sport_id] ?? 0) + 1;
  });
  const topSports = Object.entries(sportTally).sort(([, a], [, b]) => b - a);

  // Geo tally (city+state)
  const geoTally: Record<string, number> = {};
  (geoData ?? []).forEach((row: any) => {
    const key = `${row.city}, ${row.state}`;
    geoTally[key] = (geoTally[key] ?? 0) + 1;
  });
  const topCities = Object.entries(geoTally).sort(([, a], [, b]) => b - a).slice(0, 10);

  // Last 14 days array
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000);
    return d.toISOString().split("T")[0];
  });

  const maxSignups = Math.max(...last14Days.map((d) => signupsByDay[d] ?? 0), 1);

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">📊 Analytics</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Deep data on your platform</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { value: totalProfiles ?? 0, label: "Total athletes" },
          { value: avgSportsPerUser, label: "Avg sports/athlete" },
          { value: totalSportRows ?? 0, label: "Total sport interests" },
          { value: topCities[0]?.[0] ?? "—", label: "Top city" },
        ].map(({ value, label }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
            <p className="text-xl font-bold text-teal-400">{value}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Daily signups chart */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold">Daily Signups — Last 14 Days</h2>
        <div className="flex items-end gap-1.5 h-32">
          {last14Days.map((day) => {
            const count = signupsByDay[day] ?? 0;
            const height = Math.round((count / maxSignups) * 100);
            const label = day.slice(5); // MM-DD
            return (
              <div key={day} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <span className="text-xs text-teal-400 font-medium">{count > 0 ? count : ""}</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-teal-600 to-pink-600 transition-all"
                  style={{ height: `${Math.max(height, count > 0 ? 8 : 2)}%`, minHeight: "2px" }}
                />
                <span className="text-[10px] text-[var(--muted)] truncate w-full text-center">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sport interest */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold">Sport Interest Breakdown</h2>
        {topSports.length === 0 && <p className="text-sm text-[var(--muted)]">No data yet.</p>}
        {topSports.map(([sportId, count]) => {
          const pct = totalSportRows ? Math.round((count / totalSportRows) * 100) : 0;
          return (
            <div key={sportId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize">{sportId.replace(/_/g, " ")}</span>
                <span className="text-[var(--muted)]">{count} athletes ({pct}%)</span>
              </div>
              <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-600 to-pink-600 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Geographic breakdown */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold">Top Cities</h2>
        {topCities.length === 0 && <p className="text-sm text-[var(--muted)]">No data yet.</p>}
        {topCities.map(([city, count]) => {
          const pct = totalProfiles ? Math.round((count / totalProfiles) * 100) : 0;
          return (
            <div key={city} className="flex items-center gap-3">
              <span className="text-sm w-48 truncate">{city}</span>
              <div className="flex-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-600 to-yellow-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-[var(--muted)] w-16 text-right">{count} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
