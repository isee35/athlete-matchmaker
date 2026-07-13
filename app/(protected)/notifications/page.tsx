import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/Card";
import { MarkAllRead } from "./MarkAllRead";
import { NotificationList } from "./NotificationList";

export const dynamic = "force-dynamic";

export default async function Notifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, action_url, read, created_at, metadata")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

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
        <NotificationList notifications={notifications as any} />
      ) : (
        <Card className="text-center py-12 space-y-2">
          <p className="text-3xl">🔔</p>
          <p className="text-[var(--muted-light)]">All caught up! No notifications yet.</p>
        </Card>
      )}
    </div>
  );
}
