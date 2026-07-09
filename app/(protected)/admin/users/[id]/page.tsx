import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSportById } from "@/lib/sports";
import { AdminUserActions } from "../AdminUserActions";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", adminUser!.id)
    .single();

  if (!adminProfile || !["admin", "ambassador"].includes(adminProfile.role)) redirect("/dashboard");

  // Load the target user's full profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) return (
    <div className="p-6">
      <Link href="/admin/users" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">← Users</Link>
      <p className="mt-4 text-[var(--muted)]">User not found.</p>
    </div>
  );

  // All their data in parallel
  const [
    { data: sports },
    { data: joinedLobbies },
    { data: createdLobbies },
    { data: noShowReports },
    { data: noShowsAgainst },
    { data: badges },
    { data: followers },
    { data: following },
    { data: alerts },
    { data: consentRecord },
  ] = await Promise.all([
    supabase.from("user_sports").select("sport_id, skill_level, skill_rating, skill_verified, subdivision_ids").eq("user_id", id),
    supabase.from("lobby_members")
      .select("status, joined_at, lobbies(id, title, sport_id, date, time, location, status)")
      .eq("user_id", id)
      .order("joined_at", { ascending: false })
      .limit(20),
    supabase.from("lobbies")
      .select("id, title, sport_id, date, status, current_players, max_players")
      .eq("creator_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("no_show_reports")
      .select("id, created_at, reviewed, lobbies(title, date)")
      .eq("reporter_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("no_show_reports")
      .select("id, created_at, reviewed, lobbies(title, date)")
      .eq("reported_user_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("user_badges")
      .select("badge_id, earned_at, badges(name, emoji, description)")
      .eq("user_id", id)
      .order("earned_at", { ascending: false }),
    supabase.from("followers").select("id", { count: "exact" }).eq("following_id", id),
    supabase.from("followers").select("id", { count: "exact" }).eq("follower_id", id),
    supabase.from("admin_alerts").select("id, type, title, body, created_at, resolved").eq("user_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.from("parental_consents").select("*").eq("user_id", id).single(),
  ]);

  const age = profile.dob ? (() => {
    const b = new Date(profile.dob);
    const n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() - b.getMonth() < 0 || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  })() : null;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/admin" className="hover:text-[var(--foreground)]">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/users" className="hover:text-[var(--foreground)]">Users</Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">@{profile.username ?? id}</span>
      </div>

      {/* Profile header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-600 to-pink-600 flex items-center justify-center text-2xl font-black text-white">
                {(profile.first_name?.[0] ?? "?").toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-black">{profile.first_name} {profile.last_name}</h1>
              <p className="text-sm text-[var(--muted)]">@{profile.username ?? "—"}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {profile.signup_number && <span className="text-xs font-mono text-[var(--muted)]">User #{profile.signup_number}</span>}
                {profile.signup_number && profile.signup_number <= 1000 && <span className="text-xs bg-yellow-900/20 text-yellow-400 border border-yellow-700/30 px-2 py-0.5 rounded-full">🏅 Founding Member</span>}
                {profile.plan === "paid" && <span className="text-xs bg-teal-600/20 text-teal-400 border border-teal-600/30 px-2 py-0.5 rounded-full">⚡ Paid</span>}
                {profile.plan === "founder" && <span className="text-xs bg-yellow-900/20 text-yellow-400 border border-yellow-700/30 px-2 py-0.5 rounded-full">👑 Founder plan</span>}
                {profile.role === "admin" && <span className="text-xs bg-pink-600/20 text-pink-400 border border-pink-600/30 px-2 py-0.5 rounded-full">Admin</span>}
                {profile.role === "ambassador" && <span className="text-xs bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 px-2 py-0.5 rounded-full">Ambassador</span>}
                {profile.is_minor && <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-2 py-0.5 rounded-full">Minor</span>}
                {profile.soft_flag && <span className="text-xs bg-red-600/20 text-red-400 border border-red-600/30 px-2 py-0.5 rounded-full">🚩 Flagged</span>}
                {profile.parental_consent_pending && <span className="text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-700/30 px-2 py-0.5 rounded-full">⏳ Consent Pending</span>}
              </div>
            </div>
          </div>
          <AdminUserActions userId={id} isFlagged={profile.soft_flag} isAdmin={profile.role === "admin"} />
        </div>

        {/* Key stats grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t border-[var(--border)]">
          {[
            { label: "Lobbies joined", value: profile.lobby_count ?? 0 },
            { label: "Followers", value: followers?.length ?? 0 },
            { label: "Following", value: following?.length ?? 0 },
            { label: "High fives", value: profile.high_five_count ?? 0 },
            { label: "No-shows", value: profile.no_show_count ?? 0, warn: (profile.no_show_count ?? 0) >= 3 },
            { label: "Sports", value: sports?.length ?? 0 },
          ].map(({ label, value, warn }) => (
            <div key={label} className="text-center">
              <p className={`text-lg font-bold ${warn ? "text-red-400" : ""}`}>{value}</p>
              <p className="text-[10px] text-[var(--muted)] leading-tight mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Identity & contact */}
      <Section title="Identity & Contact">
        <Grid2>
          <Field label="Email" value={profile.email ?? "—"} />
          <Field label="Phone" value={profile.phone ?? "Private / not set"} />
          <Field label="Location" value={profile.city ? `${profile.city}, ${profile.state}` : "—"} />
          <Field label="Age" value={age !== null ? `${age} yrs${profile.dob ? ` (${profile.dob})` : ""}` : "—"} />
          <Field label="Role" value={profile.role ?? "user"} />
          <Field label="Plan" value={profile.plan ?? "free"} />
          <Field label="Signup #" value={profile.signup_number ? `#${profile.signup_number}${profile.signup_number <= 1000 ? " 🏅" : ""}` : "Not assigned yet"} />
          <Field label="Region" value={profile.region ?? "—"} />
          <Field label="Joined" value={new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
          <Field label="Onboarding" value={profile.onboarding_complete ? "Complete" : "Incomplete"} />
        </Grid2>
        {profile.is_minor && consentRecord && (
          <div className="mt-3 bg-yellow-900/10 border border-yellow-700/30 rounded-xl p-3 text-sm space-y-1">
            <p className="font-medium text-yellow-400">👶 Minor Account</p>
            <p className="text-[var(--muted)]">Parent: {consentRecord.parent_name ?? "—"} ({consentRecord.parent_email})</p>
            <p className="text-[var(--muted)]">Consent: {consentRecord.consented ? `✅ Approved ${new Date(consentRecord.consented_at).toLocaleDateString()}` : "⏳ Pending"}</p>
          </div>
        )}
      </Section>

      {/* Sports & skills */}
      <Section title="Sports & Skills">
        {(!sports || sports.length === 0) ? (
          <p className="text-sm text-[var(--muted)]">No sports on profile.</p>
        ) : (
          <div className="space-y-2">
            {(sports as any[]).map((us) => {
              const sport = getSportById(us.sport_id);
              return (
                <div key={us.sport_id} className="flex items-center justify-between bg-[var(--surface-2)] rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{sport?.emoji ?? "🏅"}</span>
                    <div>
                      <p className="text-sm font-medium">{sport?.label ?? us.sport_id}</p>
                      {us.subdivision_ids?.length > 0 && (
                        <p className="text-xs text-[var(--muted)]">{us.subdivision_ids.join(", ")}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-[var(--muted)]">
                    {us.skill_rating && <p className="text-teal-400 font-medium">{us.skill_rating} {us.skill_verified ? "✓" : ""}</p>}
                    {us.skill_level && !us.skill_rating && <p className="capitalize">{us.skill_level}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Badges */}
      {(badges ?? []).length > 0 && (
        <Section title="Badges">
          <div className="flex flex-wrap gap-2">
            {(badges as any[]).map((ub) => (
              <div key={ub.badge_id} className="flex items-center gap-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-sm" title={ub.badges?.description}>
                <span>{ub.badges?.emoji ?? "🏅"}</span>
                <span>{ub.badges?.name ?? ub.badge_id}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Lobby history */}
      <Section title="Lobby History (joined)">
        {(!joinedLobbies || joinedLobbies.length === 0) ? (
          <p className="text-sm text-[var(--muted)]">No lobby history.</p>
        ) : (
          <div className="space-y-1.5">
            {(joinedLobbies as any[]).map((m) => {
              const lobby = m.lobbies;
              if (!lobby) return null;
              const sport = getSportById(lobby.sport_id);
              return (
                <Link key={`${m.lobby_id}-${m.joined_at}`} href={`/lobbies/${lobby.id}`}>
                  <div className="flex items-center gap-3 bg-[var(--surface-2)] rounded-xl px-4 py-2.5 hover:border hover:border-teal-600/30 transition-colors">
                    <span className="text-base">{sport?.emoji ?? "🏅"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lobby.title}</p>
                      <p className="text-xs text-[var(--muted)]">{lobby.date} · {lobby.location ?? "—"}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      lobby.status === "open"
                        ? "bg-teal-900/20 text-teal-400 border-teal-700/30"
                        : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)]"
                    }`}>{lobby.status}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      {/* Created lobbies */}
      {(createdLobbies ?? []).length > 0 && (
        <Section title="Lobbies Created">
          <div className="space-y-1.5">
            {(createdLobbies as any[]).map((lobby) => {
              const sport = getSportById(lobby.sport_id);
              return (
                <Link key={lobby.id} href={`/lobbies/${lobby.id}`}>
                  <div className="flex items-center gap-3 bg-[var(--surface-2)] rounded-xl px-4 py-2.5 hover:border hover:border-teal-600/30 transition-colors">
                    <span className="text-base">{sport?.emoji ?? "🏅"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lobby.title}</p>
                      <p className="text-xs text-[var(--muted)]">{lobby.date} · {lobby.current_players ?? 0}/{lobby.max_players ?? "∞"} players</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      lobby.status === "open"
                        ? "bg-teal-900/20 text-teal-400 border-teal-700/30"
                        : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)]"
                    }`}>{lobby.status}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* No-show reports received */}
      {(noShowsAgainst ?? []).length > 0 && (
        <Section title={`No-Show Reports Against (${noShowsAgainst?.length ?? 0})`}>
          <div className="space-y-1.5">
            {(noShowsAgainst as any[]).map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-red-900/10 border border-red-700/20 rounded-xl px-4 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{r.lobbies?.title ?? "—"}</p>
                  <p className="text-xs text-[var(--muted)]">{r.lobbies?.date ?? "—"}</p>
                </div>
                <span className={`text-xs ${r.reviewed ? "text-teal-400" : "text-yellow-400"}`}>
                  {r.reviewed ? "Reviewed" : "Pending review"}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Admin alerts for this user */}
      {(alerts ?? []).length > 0 && (
        <Section title="Admin Alerts (related to this user)">
          <div className="space-y-1.5">
            {(alerts as any[]).map((a) => (
              <div key={a.id} className="flex items-start gap-3 bg-[var(--surface-2)] rounded-xl px-4 py-2.5 text-sm">
                <span>{a.type === "milestone_50" ? "🏆" : a.type === "no_show_flag" ? "⚠️" : "📌"}</span>
                <div className="flex-1">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-[var(--muted)]">{a.body}</p>
                </div>
                <span className={`text-xs shrink-0 ${a.resolved ? "text-teal-400" : "text-yellow-400"}`}>
                  {a.resolved ? "✓ Done" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Public profile link */}
      <div className="pb-6">
        <Link href={`/u/${profile.username}`} className="text-sm text-teal-400 hover:text-teal-300">
          View public profile →
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-sm text-[var(--foreground)] font-medium mt-0.5">{value}</p>
    </div>
  );
}
