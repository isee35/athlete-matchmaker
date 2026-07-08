import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/Card";

export default async function Admin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user!.id).single();
  if (!profile?.is_admin) redirect("/dashboard");

  const [{ count: userCount }, { count: lobbyCount }, { count: reportCount }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("lobbies").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("no_show_reports").select("*", { count: "exact", head: true }).eq("reviewed", false),
  ]);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black">
          Admin Panel <span className="text-pink-400">🛡️</span>
        </h1>
        <p className="text-sm text-[var(--muted-light)] mt-1">Manage users, lobbies, and reports.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-bold text-teal-400">{userCount ?? 0}</p>
          <p className="text-xs text-[var(--muted)]">Total Athletes</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">{lobbyCount ?? 0}</p>
          <p className="text-xs text-[var(--muted)]">Open Lobbies</p>
        </Card>
        <Card className={`text-center ${(reportCount ?? 0) > 0 ? "border-red-600/50" : ""}`}>
          <p className={`text-2xl font-bold ${(reportCount ?? 0) > 0 ? "text-red-400" : ""}`}>{reportCount ?? 0}</p>
          <p className="text-xs text-[var(--muted)]">Pending Reports</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: "/admin/users",   icon: "👥", label: "Manage Users",   desc: "View, flag, or restrict accounts" },
          { href: "/admin/lobbies", icon: "🎮", label: "Manage Lobbies", desc: "Review and remove lobbies" },
          { href: "/admin/reports", icon: "⚠️",  label: "No-Show Reports", desc: "Review flagged no-shows" },
        ].map(({ href, icon, label, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-teal-600/50 transition-colors cursor-pointer h-full">
              <div className="text-3xl mb-2">{icon}</div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-[var(--muted)] mt-1">{desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Seed admins reminder */}
      <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 text-xs text-[var(--muted)] space-y-1">
        <p className="font-medium text-[var(--muted-light)]">Admin accounts</p>
        <p>To grant admin to Buddy once he signs up, run this in your Supabase SQL editor:</p>
        <code className="block bg-[var(--surface)] px-3 py-2 rounded-lg text-teal-400 mt-1">
          UPDATE profiles SET is_admin = true WHERE id = (SELECT id FROM auth.users WHERE email = &apos;buddyhammond17@yahoo.com&apos;);
        </code>
      </div>
    </div>
  );
}
