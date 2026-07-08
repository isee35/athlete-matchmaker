import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card } from "@/components/Card";
import { MarkAllRead } from "./MarkAllRead";

export default async function Notifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const typeIcon: Record<string, string> = {
    availability_overlap: "📅",
    lobby_invite: "🎮",
    lobby_update: "🔄",
    lobby_full: "✅",
    lobby_locked: "🔒",
    waitlist_promoted: "🎉",
    member_bailed: "👋",
    confirmation_24h: "⏰",
    no_show_reported: "⚠️",
    admin_message: "🛡️",
  };

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Notifications</h1>
          <p className="text-sm text-[var(--muted-light)] mt-1">Stay in the loop with your squad.</p>
        </div>
        {notifications && notifications.some((n: any) => !n.read) && (
          <MarkAllRead userId={user!.id} />
        )}
      </div>

      {notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div key={n.id}>
              {n.action_url ? (
                <Link href={n.action_url}>
                  <NotifCard notification={n} typeIcon={typeIcon} />
                </Link>
              ) : (
                <NotifCard notification={n} typeIcon={typeIcon} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12 space-y-2">
          <p className="text-3xl">🔔</p>
          <p className="text-[var(--muted-light)]">All caught up! No notifications yet.</p>
        </Card>
      )}
    </div>
  );
}

function NotifCard({ notification, typeIcon }: { notification: any; typeIcon: Record<string, string> }) {
  return (
    <div className={`flex items-start gap-3 bg-[var(--surface)] border rounded-xl px-4 py-3 transition-colors hover:border-teal-600/50 cursor-pointer ${!notification.read ? "border-teal-600/30" : "border-[var(--border)]"}`}>
      <span className="text-2xl shrink-0 mt-0.5">{typeIcon[notification.type] ?? "🔔"}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${!notification.read ? "text-[var(--foreground)]" : "text-[var(--muted-light)]"}`}>{notification.title}</p>
        <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">{notification.body}</p>
        <p className="text-xs text-[var(--muted)] mt-1">{new Date(notification.created_at).toLocaleDateString()}</p>
      </div>
      {!notification.read && <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0 mt-1.5" />}
    </div>
  );
}
