import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminUserActions } from "./AdminUserActions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, region")
    .eq("id", user!.id)
    .single();

  if (!profile || !["admin", "ambassador"].includes(profile.role)) redirect("/dashboard");

  const filter = sp.filter ?? "all";
  const q = sp.q ?? "";
  const page = parseInt(sp.page ?? "1");
  const pageSize = 30;

  let query = supabase
    .from("profiles")
    .select("id, username, first_name, last_name, role, is_minor, parental_consent_pending, lobby_count, created_at, city, state, soft_flag, no_show_count")
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filter === "consent") query = query.eq("parental_consent_pending", true);
  else if (filter === "minors") query = query.eq("is_minor", true);
  else if (filter === "admins") query = query.in("role", ["admin", "ambassador"]);
  else if (filter === "flagged") query = query.eq("soft_flag", true);

  if (q) {
    query = query.or(`username.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  }

  const { data: users } = await query;

  const { count: consentCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("parental_consent_pending", true);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">👥 User Management</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Search, review, and manage athletes</p>
        </div>
        {(consentCount ?? 0) > 0 && (
          <Link href="/admin/users?filter=consent" className="text-xs bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 px-3 py-1.5 rounded-full font-semibold hover:bg-yellow-900/50 transition-colors">
            {consentCount} awaiting parental consent
          </Link>
        )}
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <form method="get" action="/admin/users" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or username…"
            className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-teal-600/60"
          />
          <button type="submit" className="px-4 py-2.5 rounded-xl bg-teal-600/20 border border-teal-600/30 text-teal-400 text-sm font-medium hover:bg-teal-600/30 transition-colors">
            Search
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All" },
            { key: "consent", label: "👶 Consent Pending" },
            { key: "minors", label: "🧒 Minors" },
            { key: "flagged", label: "🚩 Flagged" },
            { key: "admins", label: "🛡️ Staff" },
          ].map(({ key, label }) => (
            <Link
              key={key}
              href={`/admin/users?filter=${key}${q ? `&q=${q}` : ""}`}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                filter === key
                  ? "bg-pink-600/20 border-pink-600/40 text-pink-300"
                  : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Users list */}
      <div className="space-y-2">
        {(!users || users.length === 0) && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--muted)]">
            No users found.
          </div>
        )}
        {(users as any[] ?? []).map((u) => (
          <div
            key={u.id}
            className={`bg-[var(--surface)] border rounded-xl px-4 py-3 flex items-center justify-between gap-4 ${
              u.soft_flag ? "border-red-600/40" : "border-[var(--border)]"
            }`}
          >
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">@{u.username ?? "—"}</p>
                {u.role === "admin" && <span className="text-xs bg-pink-600/20 text-pink-400 border border-pink-600/30 px-2 py-0.5 rounded-full">Admin</span>}
                {u.role === "ambassador" && <span className="text-xs bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 px-2 py-0.5 rounded-full">Ambassador</span>}
                {u.is_minor && <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-2 py-0.5 rounded-full">Minor</span>}
                {u.parental_consent_pending && <span className="text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-700/30 px-2 py-0.5 rounded-full">⏳ Consent pending</span>}
                {u.soft_flag && <span className="text-xs bg-red-600/20 text-red-400 border border-red-600/30 px-2 py-0.5 rounded-full">🚩 Flagged</span>}
                {(u.no_show_count ?? 0) > 0 && <span className="text-xs text-yellow-400">{u.no_show_count} no-show(s)</span>}
              </div>
              <p className="text-xs text-[var(--muted)]">
                {u.first_name} {u.last_name}
                {u.city && ` · ${u.city}, ${u.state}`}
                {" · "}{u.lobby_count ?? 0} lobbies
                {" · "}joined {new Date(u.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link href={`/admin/users/${u.id}`} className="text-xs text-teal-400 hover:text-teal-300">
                View →
              </Link>
              <AdminUserActions userId={u.id} isFlagged={u.soft_flag} isAdmin={u.role === "admin"} />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[var(--muted)]">
        <span>Page {page}</span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={`/admin/users?filter=${filter}&page=${page - 1}${q ? `&q=${q}` : ""}`}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:text-[var(--foreground)] transition-colors">
              ← Prev
            </Link>
          )}
          {(users?.length ?? 0) === pageSize && (
            <Link href={`/admin/users?filter=${filter}&page=${page + 1}${q ? `&q=${q}` : ""}`}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:text-[var(--foreground)] transition-colors">
              Next →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
