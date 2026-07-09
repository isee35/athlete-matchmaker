"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Alert {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  user_id?: string;
  lobby_id?: string;
  resolved: boolean;
  resolved_at?: string;
}

const ICONS: Record<string, string> = {
  milestone_50: "🏆",
  pending_approval: "🎮",
  no_show_flag: "⚠️",
  pending_consent: "👶",
  flag_user: "🚩",
};

export function AlertFeed({ alerts: initial, showHistory }: { alerts: Alert[]; showHistory?: boolean }) {
  const [alerts, setAlerts] = useState(initial);
  const [resolving, setResolving] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function resolve(alertId: string) {
    setResolving(alertId);
    await supabase
      .from("admin_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setResolving(null);
    router.refresh();
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-6 text-center text-sm text-[var(--muted)]">
        {showHistory ? "No completed tasks yet." : "No pending alerts. 🎉"}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div key={alert.id} className={`flex items-start gap-3 bg-[var(--surface)] border rounded-xl px-4 py-3 ${alert.resolved ? "border-[var(--border)] opacity-70" : "border-[var(--border)]"}`}>
          <span className="text-lg mt-0.5 shrink-0">
            {ICONS[alert.type] ?? "📌"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{alert.title}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{alert.body}</p>
            {alert.resolved && alert.resolved_at && (
              <p className="text-xs text-teal-600 mt-1">✓ Completed {new Date(alert.resolved_at).toLocaleDateString()}</p>
            )}
            <div className="flex gap-3 mt-2 flex-wrap">
              {alert.user_id && (
                <Link href={`/admin/users/${alert.user_id}`} className="text-xs text-teal-400 hover:text-teal-300">
                  View user →
                </Link>
              )}

              {alert.lobby_id && (
                <Link href={`/admin/lobbies?highlight=${alert.lobby_id}`} className="text-xs text-teal-400 hover:text-teal-300">
                  View lobby →
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <p className="text-xs text-[var(--muted)] whitespace-nowrap">{new Date(alert.created_at).toLocaleDateString()}</p>
            {!alert.resolved && (
              <button
                onClick={() => resolve(alert.id)}
                disabled={resolving === alert.id}
                className="text-xs bg-teal-900/30 border border-teal-700/30 text-teal-400 px-2.5 py-1 rounded-lg hover:bg-teal-900/50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {resolving === alert.id ? "…" : "✓ Done"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
