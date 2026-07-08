import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/Card";
import { ReviewReport } from "./ReviewReport";

export default async function AdminReports() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user!.id).single();
  if (!me?.is_admin) redirect("/dashboard");

  const { data: reports } = await supabase
    .from("no_show_reports")
    .select("*, reporter:profiles!reporter_id(username), reported:profiles!reported_user_id(username, no_show_count), lobbies(title, date, sport_id)")
    .eq("reviewed", false)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <h1 className="text-xl font-black">No-Show Reports</h1>
      {reports && reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map((r: any) => (
            <Card key={r.id} className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  <span className="text-red-400">@{r.reported?.username}</span> reported for no-show
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Reported by @{r.reporter?.username} · Lobby: {r.lobbies?.title} ({r.lobbies?.date})
                </p>
                {r.notes && <p className="text-xs text-[var(--muted-light)]">Notes: {r.notes}</p>}
                <p className="text-xs text-yellow-400">Total no-shows on record: {r.reported?.no_show_count}</p>
              </div>
              <ReviewReport reportId={r.id} reportedUserId={r.reported_user_id} />
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-8">
          <p className="text-[var(--muted)]">No pending reports. 🎉</p>
        </Card>
      )}
    </div>
  );
}
