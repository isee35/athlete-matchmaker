import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertFeed } from "@/components/AlertFeed";

export const dynamic = "force-dynamic";

const ALERT_TYPES = [
  { key: "all", label: "All" },
  { key: "milestone_50", label: "🏆 Milestones" },
  { key: "pending_approval", label: "🎮 Lobby Approvals" },
  { key: "no_show_flag", label: "⚠️ No-Show Flags" },
  { key: "pending_consent", label: "👶 Parental Consent" },
  { key: "flag_user", label: "🚩 Flagged Users" },
];

export default async function AlertsHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (!profile || !["admin", "ambassador"].includes(profile.role)) redirect("/dashboard");

  const typeFilter = sp.type ?? "all";
  const page = parseInt(sp.page ?? "1");
  const pageSize = 30;

  let query = supabase
    .from("admin_alerts")
    .select("id, type, title, body, created_at, resolved, resolved_at, user_id, lobby_id")
    .eq("resolved", true)
    .order("resolved_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (typeFilter !== "all") query = query.eq("type", typeFilter);

  const { data: alerts } = await query;

  // Counts by type for the filter badges
  const { data: typeCounts } = await supabase
    .from("admin_alerts")
    .select("type")
    .eq("resolved", true);

  const tally: Record<string, number> = {};
  (typeCounts ?? []).forEach((r: any) => {
    tally[r.type] = (tally[r.type] ?? 0) + 1;
  });

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm">← Dashboard</Link>
        <span className="text-[var(--border)]">/</span>
        <h1 className="text-xl font-black">Completed Tasks</h1>
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap gap-2">
        {ALERT_TYPES.map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin/alerts?type=${key}`}
            className={`text-xs px-3 py-1.5 rounded-xl border transition-colors ${
              typeFilter === key
                ? "bg-pink-600/20 border-pink-600/40 text-pink-300"
                : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
            {key !== "all" && tally[key] ? ` (${tally[key]})` : ""}
          </Link>
        ))}
      </div>

      <AlertFeed alerts={alerts ?? []} showHistory />

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[var(--muted)]">
        <span>Page {page}</span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={`/admin/alerts?type=${typeFilter}&page=${page - 1}`}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:text-[var(--foreground)] transition-colors">
              ← Prev
            </Link>
          )}
          {(alerts?.length ?? 0) === pageSize && (
            <Link href={`/admin/alerts?type=${typeFilter}&page=${page + 1}`}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:text-[var(--foreground)] transition-colors">
              Next →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
