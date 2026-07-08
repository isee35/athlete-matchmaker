import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/Card";
import { AdminUserActions } from "./AdminUserActions";

export default async function AdminUsers() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user!.id).single();
  if (!me?.is_admin) redirect("/dashboard");

  const { data: users } = await supabase
    .from("profiles")
    .select("id, username, first_name, last_name, city, state, is_admin, soft_flag, no_show_count, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-black">Users ({users?.length ?? 0})</h1>
      </div>
      <div className="space-y-2">
        {users?.map((u: any) => (
          <div key={u.id} className={`bg-[var(--surface)] border rounded-xl px-4 py-3 flex items-center justify-between gap-4 ${u.soft_flag ? "border-red-600/40" : "border-[var(--border)]"}`}>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">@{u.username}</p>
                {u.is_admin && <span className="text-xs bg-pink-600/20 text-pink-400 border border-pink-600/30 px-2 py-0.5 rounded-full">Admin</span>}
                {u.soft_flag && <span className="text-xs bg-red-600/20 text-red-400 border border-red-600/30 px-2 py-0.5 rounded-full">Flagged</span>}
                {u.no_show_count > 0 && <span className="text-xs text-yellow-400">{u.no_show_count} no-show(s)</span>}
              </div>
              <p className="text-xs text-[var(--muted)]">{u.first_name} {u.last_name} {u.city && `· ${u.city}, ${u.state}`}</p>
            </div>
            <AdminUserActions userId={u.id} isFlagged={u.soft_flag} isAdmin={u.is_admin} />
          </div>
        ))}
      </div>
    </div>
  );
}
