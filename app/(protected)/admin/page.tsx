import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/Card";
import { AlertFeed } from "@/components/AlertFeed";

export const dynamic = "force-dynamic";

function StatCard({ value, label, sub, highlight }: { value: string | number; label: string; sub?: string; highlight?: "red" | "yellow" | "teal" | "pink" }) {
  const colors = {
    red:    "text-red-400",
    yellow: "text-yellow-400",
    teal:   "text-teal-400",
    pink:   "text-pink-400",
  };
  return (
    <Card className={highlight ? `border-${highlight}-600/40` : ""}>
      <p className={`text-2xl font-bold ${highlight ? colors[highlight] : "text-[var(--foreground)]"}`}>{value}</p>
      <p className="text-xs text-[var(--muted)] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-[var(--muted-light)] mt-1">{sub}</p>}
    </Card>
  );
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, region")
    .eq("id", user!.id)
    .single();

  if (!profile || !["admin", "ambassador"].includes(profile.role)) redirect("/dashboard");

  const isAdmin = profile.role === "admin";
  const region = profile.region;

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);

  const [
    { count: totalUsers },
    { count: newToday },
    { count: newYesterday },
    { count: thisMonthUsers },
    { count: openLobbies },
    { count: todayLobbies },
    { count: weekLobbies },
    { count: pendingReports },
    { count: pendingConsents },
    { count: pendingApprovals },
    { data: alerts },
    { data: sportCounts },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", yesterday).lt("created_at", today),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", thisMonth + "-01"),
    supabase.from("lobbies").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("lobbies").select("*", { count: "exact", head: true }).eq("date", today),
    supabase.from("lobbies").select("*", { count: "exact", head: true }).gte("date", today).lte("date", in7Days),
    supabase.from("no_show_reports").select("*", { count: "exact", head: true }).eq("reviewed", false),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("parental_consent_pending", true),
    supabase.from("lobbies").select("*", { count: "exact", head: true }).eq("pending_approval", true),
    supabase.from("admin_alerts").select("id, type, title, body, created_at, user_id").eq("resolved", false).order("created_at", { ascending: false }).limit(10),
    supabase.from("user_sports").select("sport_id"),
  ]);

  // Tally sport interest
  const sportTally: Record<string, number> = {};
  (sportCounts ?? []).forEach((row: any) => {
    sportTally[row.sport_id] = (sportTally[row.sport_id] ?? 0) + 1;
  });
  const topSports = Object.entries(sportTally)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const totalAlerts = (pendingReports ?? 0) + (pendingConsents ?? 0) + (pendingApprovals ?? 0);

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            {isAdmin ? "🛡️ Admin Dashboard" : "🌎 Ambassador Dashboard"}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {isAdmin ? "Full platform overview" : `Managing: ${region ?? "your region"}`}
          </p>
        </div>
        <span className="text-xs bg-pink-600/20 border border-pink-600/30 text-pink-400 px-3 py-1.5 rounded-full font-semibold">
          {isAdmin ? "Admin" : "Ambassador"}
        </span>
      </div>

      {/* Alert tray */}
      {totalAlerts > 0 && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-bold text-red-400">🚨 Action required ({totalAlerts} items)</p>
          <div className="flex flex-wrap gap-2">
            {(pendingReports ?? 0) > 0 && (
              <Link href="/admin/reports" className="text-xs bg-red-900/40 border border-red-700/50 text-red-300 px-3 py-1.5 rounded-xl hover:bg-red-900/60 transition-colors">
                ⚠️ {pendingReports} no-show reports pending
              </Link>
            )}
            {(pendingConsents ?? 0) > 0 && (
              <Link href="/admin/users?filter=consent" className="text-xs bg-yellow-900/40 border border-yellow-700/50 text-yellow-300 px-3 py-1.5 rounded-xl hover:bg-yellow-900/60 transition-colors">
                👶 {pendingConsents} parental consents pending
              </Link>
            )}
            {(pendingApprovals ?? 0) > 0 && (
              <Link href="/admin/lobbies?filter=pending" className="text-xs bg-orange-900/40 border border-orange-700/50 text-orange-300 px-3 py-1.5 rounded-xl hover:bg-orange-900/60 transition-colors">
                🎮 {pendingApprovals} lobbies awaiting approval
              </Link>
            )}
          </div>
        </div>
      )}

      {/* User stats */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Users</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard value={totalUsers ?? 0} label="Total athletes" highlight="teal" />
          <StatCard value={newToday ?? 0} label="Joined today" sub={`${newYesterday ?? 0} yesterday`} highlight={(newToday ?? 0) > 0 ? "teal" : undefined} />
          <StatCard value={thisMonthUsers ?? 0} label="This month" />
          <StatCard value={pendingConsents ?? 0} label="Awaiting parental consent" highlight={(pendingConsents ?? 0) > 0 ? "yellow" : undefined} />
        </div>
      </div>

      {/* Lobby stats */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Lobbies</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard value={openLobbies ?? 0} label="Open lobbies" highlight="teal" />
          <StatCard value={todayLobbies ?? 0} label="Happening today" />
          <StatCard value={weekLobbies ?? 0} label="Next 7 days" />
          <StatCard value={pendingApprovals ?? 0} label="Awaiting approval" highlight={(pendingApprovals ?? 0) > 0 ? "yellow" : undefined} />
        </div>
      </div>

      {/* Admin alerts feed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">
            Pending Alerts {(alerts ?? []).length > 0 && `(${(alerts ?? []).length})`}
          </h2>
          <Link href="/admin/alerts" className="text-xs text-teal-400 hover:text-teal-300">
            View completed history →
          </Link>
        </div>
        <AlertFeed alerts={alerts ?? []} />
      </div>

      {/* Sport interest breakdown */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Sport Interest (by registered athletes)</h2>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-2">
          {topSports.length === 0 && <p className="text-sm text-[var(--muted)]">No data yet.</p>}
          {topSports.map(([sportId, count]) => {
            const pct = totalUsers ? Math.round((count / totalUsers) * 100) : 0;
            return (
              <div key={sportId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--foreground)] capitalize">{sportId.replace(/_/g, " ")}</span>
                  <span className="text-[var(--muted)]">{count} ({pct}%)</span>
                </div>
                <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-600 to-pink-600 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Manage</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/admin/lobbies",   icon: "🎮", label: "Lobbies",    desc: "Review & approve" },
            { href: "/admin/users",     icon: "👥", label: "Users",      desc: "Search, flag, restrict" },
            { href: "/admin/reports",   icon: "⚠️",  label: "Reports",   desc: "No-show queue" },
            { href: "/admin/analytics", icon: "📊", label: "Analytics",  desc: "Deep reports" },
          ].map(({ href, icon, label, desc }) => (
            <Link key={href} href={href}>
              <Card className="hover:border-pink-600/40 transition-colors cursor-pointer h-full">
                <div className="text-2xl mb-1">{icon}</div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
