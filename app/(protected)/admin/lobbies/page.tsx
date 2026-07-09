import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ApproveLobbyButton, CancelLobbyButton } from "./LobbyActions";
import { CalendarView } from "@/components/CalendarView";
import { SPORTS } from "@/lib/sports";

const SPORT_EMOJIS: Record<string, string> = {};
SPORTS.forEach((s) => { SPORT_EMOJIS[s.id] = s.emoji; });

export const dynamic = "force-dynamic";

export default async function AdminLobbiesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sport?: string; page?: string; tab?: string }>;
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

  const isAdmin = profile.role === "admin";
  const region = profile.region;
  const filter = sp.filter ?? "all";
  const tab = sp.tab ?? "table";
  const page = parseInt(sp.page ?? "1");
  const pageSize = 25;

  let query = supabase
    .from("lobbies")
    .select(`
      id, title, sport_id, date, time, location, max_players,
      current_players, status, pending_approval, is_private,
      estimated_cost, created_at, is_custom,
      creator:profiles!lobbies_creator_id_fkey(username, first_name, last_name)
    `)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filter === "pending") query = query.eq("pending_approval", true);
  else if (filter === "open") query = query.eq("status", "open");
  else if (filter === "cancelled") query = query.eq("status", "cancelled");

  if (sp.sport) query = query.eq("sport_id", sp.sport);
  if (!isAdmin && region) query = query.ilike("location", `%${region}%`);

  const { data: lobbies } = await query;

  const { count: pendingCount } = await supabase
    .from("lobbies")
    .select("*", { count: "exact", head: true })
    .eq("pending_approval", true);

  // Calendar data for current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthStart = `${currentMonth}-01`;
  const [calYear, calMon] = currentMonth.split("-").map(Number);
  const monthEnd = new Date(calYear, calMon, 0).toISOString().split("T")[0];

  let calQuery = supabase
    .from("lobbies")
    .select("id, title, sport_id, date, time, location, max_players, current_players, status, is_private, pending_approval")
    .gte("date", monthStart)
    .lte("date", monthEnd)
    .eq("status", "open")
    .eq("pending_approval", false)
    .order("date")
    .order("time");
  if (!isAdmin && region) calQuery = calQuery.ilike("location", `%${region}%`);
  const { data: calLobbies } = await calQuery;

  const calByDate: Record<string, any[]> = {};
  (calLobbies ?? []).forEach((l) => {
    if (!calByDate[l.date]) calByDate[l.date] = [];
    calByDate[l.date].push(l);
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black">🎮 Lobby Management</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Review, approve, and manage all lobbies</p>
        </div>
        {(pendingCount ?? 0) > 0 && (
          <span className="text-xs bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 px-3 py-1.5 rounded-full font-semibold">
            {pendingCount} pending approval
          </span>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden w-fit">
        {[{ key: "table", label: "☰ Table" }, { key: "calendar", label: "📅 Calendar" }].map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin/lobbies?tab=${key}`}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === key ? "bg-pink-600/20 text-pink-300" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Calendar tab */}
      {tab === "calendar" && (
        <CalendarView
          initialMonth={currentMonth}
          initialData={calByDate}
          userSportIds={[]}
          sportEmojis={SPORT_EMOJIS}
          sportColors={{}}
          adminMode
          adminRegion={!isAdmin ? region ?? undefined : undefined}
        />
      )}

      {/* Filters (table tab only) */}
      {tab === "table" && <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "pending", label: "⏳ Pending Approval" },
          { key: "open", label: "✅ Open" },
          { key: "cancelled", label: "❌ Cancelled" },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin/lobbies?filter=${key}`}
            className={`text-xs px-3 py-1.5 rounded-xl border transition-colors ${
              filter === key
                ? "bg-pink-600/20 border-pink-600/40 text-pink-300"
                : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>}

      {/* Table */}
      {tab === "table" && <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {(!lobbies || lobbies.length === 0) ? (
          <div className="p-8 text-center text-[var(--muted)]">No lobbies found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="px-4 py-3 text-xs text-[var(--muted)] font-medium">Lobby</th>
                  <th className="px-4 py-3 text-xs text-[var(--muted)] font-medium">Sport</th>
                  <th className="px-4 py-3 text-xs text-[var(--muted)] font-medium">Date</th>
                  <th className="px-4 py-3 text-xs text-[var(--muted)] font-medium">Players</th>
                  <th className="px-4 py-3 text-xs text-[var(--muted)] font-medium">Status</th>
                  <th className="px-4 py-3 text-xs text-[var(--muted)] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(lobbies as any[]).map((lobby) => (
                  <tr key={lobby.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="font-medium truncate">{lobby.title}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        by {lobby.creator?.username ?? "unknown"}
                        {lobby.is_private && " · 🔒 private"}
                        {lobby.is_custom && " · custom"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] capitalize">
                      {(lobby.sport_id ?? "—").replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] whitespace-nowrap">
                      {lobby.date ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {lobby.current_players ?? 0}/{lobby.max_players ?? "∞"}
                    </td>
                    <td className="px-4 py-3">
                      {lobby.pending_approval ? (
                        <span className="text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-700/30 px-2 py-0.5 rounded-full">⏳ Pending</span>
                      ) : lobby.status === "open" ? (
                        <span className="text-xs bg-teal-900/30 text-teal-400 border border-teal-700/30 px-2 py-0.5 rounded-full">✓ Open</span>
                      ) : (
                        <span className="text-xs bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)] px-2 py-0.5 rounded-full capitalize">{lobby.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/lobbies/${lobby.id}`}
                          className="text-xs text-teal-400 hover:text-teal-300"
                        >
                          View
                        </Link>
                        {lobby.pending_approval && (
                          <ApproveLobbyButton lobbyId={lobby.id} />
                        )}
                        {lobby.status === "open" && (
                          <CancelLobbyButton lobbyId={lobby.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {/* Pagination */}
      {tab === "table" && <div className="flex items-center justify-between text-sm text-[var(--muted)]">
        <span>Page {page}</span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={`/admin/lobbies?filter=${filter}&page=${page - 1}`}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:text-[var(--foreground)] transition-colors">
              ← Prev
            </Link>
          )}
          {(lobbies?.length ?? 0) === pageSize && (
            <Link href={`/admin/lobbies?filter=${filter}&page=${page + 1}`}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:text-[var(--foreground)] transition-colors">
              Next →
            </Link>
          )}
        </div>
      </div>}
    </div>
  );
}
