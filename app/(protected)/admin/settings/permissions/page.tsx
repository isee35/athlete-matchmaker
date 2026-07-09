import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RoleEditor } from "./RoleEditor";

export const dynamic = "force-dynamic";

const ROLE_ORDER = ["super_admin", "admin", "ambassador", "community_leader", "user"];

const ROLE_META: Record<string, { label: string; emoji: string; color: string; desc: string }> = {
  super_admin:       { label: "Super Admin",       emoji: "👑", color: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40",  desc: "Full platform control. Cannot be modified by anyone." },
  admin:             { label: "Admin",              emoji: "🛡️", color: "text-pink-400 bg-pink-900/20 border-pink-700/40",        desc: "Full access. Cannot modify super admins." },
  ambassador:        { label: "Ambassador",         emoji: "🌎", color: "text-blue-400 bg-blue-900/20 border-blue-700/40",       desc: "Regional manager. Sees and manages their territory." },
  community_leader:  { label: "Community Leader",  emoji: "🌟", color: "text-teal-400 bg-teal-900/20 border-teal-700/40",       desc: "Trusted power user. Elevated lobby caps + community badge." },
  user:              { label: "User",               emoji: "👤", color: "text-[var(--muted)] bg-[var(--surface-2)] border-[var(--border)]", desc: "Standard athlete account." },
};

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: me } = await supabase.from("profiles").select("role, super_admin").eq("id", user!.id).single();
  if (!me || !["admin", "super_admin"].includes(me.role)) redirect("/dashboard");

  const isSuperAdmin = me.super_admin === true;

  // Load all staff + any search
  let query = supabase
    .from("profiles")
    .select("id, username, first_name, last_name, role, super_admin, region, created_at, city, state")
    .not("role", "eq", "user")
    .order("created_at");

  if (sp.q) {
    query = query.or(`username.ilike.%${sp.q}%,first_name.ilike.%${sp.q}%,last_name.ilike.%${sp.q}%`);
  }

  const { data: staff } = await query;

  // Counts per role
  const { data: roleCounts } = await supabase
    .from("profiles")
    .select("role");

  const tally: Record<string, number> = {};
  (roleCounts ?? []).forEach((r: any) => { tally[r.role] = (tally[r.role] ?? 0) + 1; });

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-1">
            <Link href="/admin" className="hover:text-[var(--foreground)]">Dashboard</Link>
            <span>/</span>
            <span>Permissions</span>
          </div>
          <h1 className="text-2xl font-black">🔐 Permission Tiers</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Manage roles for all staff members.</p>
        </div>
        {isSuperAdmin && (
          <span className="text-xs bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 px-3 py-1.5 rounded-full font-semibold">
            👑 Super Admin — full control
          </span>
        )}
      </div>

      {/* Role tier overview */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Tier Overview</h2>
        <div className="grid gap-2">
          {ROLE_ORDER.map((role) => {
            const meta = ROLE_META[role];
            return (
              <div key={role} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${meta.color}`}>
                <span className="text-xl shrink-0">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{meta.label}</p>
                    <span className="text-xs opacity-60">{tally[role] ?? 0} {(tally[role] ?? 0) === 1 ? "person" : "people"}</span>
                  </div>
                  <p className="text-xs opacity-70 mt-0.5">{meta.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <form method="get" action="/admin/settings/permissions" className="flex gap-2">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search staff by name or username…"
          className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-teal-600/60"
        />
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-teal-600/20 border border-teal-600/30 text-teal-400 text-sm font-medium hover:bg-teal-600/30 transition-colors">
          Search
        </button>
      </form>

      {/* Promote any user by username */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold">Promote a user</h2>
        <p className="text-xs text-[var(--muted)]">Search for any athlete above and use the role editor below to change their tier. Or use the quick-promote panel:</p>
        <QuickPromoteSearch />
      </div>

      {/* Staff list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">
          Current Staff ({staff?.length ?? 0})
        </h2>
        {(!staff || staff.length === 0) && (
          <p className="text-sm text-[var(--muted)]">No staff found.</p>
        )}
        {(staff ?? []).map((member: any) => {
          const meta = ROLE_META[member.role] ?? ROLE_META.user;
          const isProtected = member.super_admin === true;
          const canEdit = isSuperAdmin || (!isProtected && member.role !== "super_admin");

          return (
            <div key={member.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{member.first_name} {member.last_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
                      {isProtected && <span className="text-xs text-yellow-400">👑 Protected</span>}
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      @{member.username ?? "—"}
                      {member.region && ` · ${member.region}`}
                      {member.city && ` · ${member.city}, ${member.state}`}
                    </p>
                  </div>
                </div>
                <Link href={`/admin/users/${member.id}`} className="text-xs text-teal-400 hover:text-teal-300">
                  View profile →
                </Link>
              </div>
              {canEdit && (
                <RoleEditor
                  userId={member.id}
                  currentRole={member.role}
                  currentRegion={member.region}
                  isSuperAdmin={isSuperAdmin}
                />
              )}
              {!canEdit && (
                <p className="text-xs text-yellow-400/70 italic">This account is protected and cannot be modified.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Client-side quick promote search placeholder
function QuickPromoteSearch() {
  return (
    <p className="text-xs text-[var(--muted)] italic">
      Search for any user on the <Link href="/admin/users" className="text-teal-400 hover:text-teal-300">Users page</Link>, open their profile, and use the Role Editor there — or search by name above to find existing staff.
    </p>
  );
}
