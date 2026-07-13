"use client";
import { useState } from "react";
import Link from "next/link";

const TYPE_ICON: Record<string, string> = {
  availability_overlap: "📅",
  lobby_invite: "🎮",
  group_invite: "👥",
  lobby_update: "🔄",
  lobby_full: "✅",
  lobby_locked: "🔒",
  waitlist_promoted: "🎉",
  member_bailed: "👋",
  confirmation_24h: "⏰",
  no_show_reported: "⚠️",
  admin_message: "🛡️",
  ambassador_application: "🌟",
};

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  read: boolean;
  created_at: string;
  metadata: string | null;
}

function GroupInviteActions({ notification, onResponded }: { notification: Notification; onResponded: (id: string) => void }) {
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [result, setResult] = useState<"accepted" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);

  let inviteId: string | null = null;
  try {
    const meta = notification.metadata ? JSON.parse(notification.metadata) : {};
    inviteId = meta.group_invite_id ?? null;
  } catch {}

  if (!inviteId) return null;

  async function respond(action: "accept" | "decline") {
    setLoading(action);
    setError(null);
    const res = await fetch("/api/groups/invites/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: inviteId, action }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { setError(data.error ?? "Error"); return; }
    setResult(action === "accept" ? "accepted" : "declined");
    onResponded(notification.id);
    if (action === "accept" && data.group_id) {
      window.location.href = `/groups/${data.group_id}`;
    }
  }

  if (result) {
    return (
      <p className={`text-xs mt-2 font-medium ${result === "accepted" ? "text-teal-400" : "text-[var(--muted)]"}`}>
        {result === "accepted" ? "✓ Joined!" : "✗ Declined"}
      </p>
    );
  }

  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={() => respond("accept")}
        disabled={!!loading}
        className="px-3 py-1 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-50 transition-colors cursor-pointer"
      >
        {loading === "accept" ? "Joining…" : "Accept"}
      </button>
      <button
        onClick={() => respond("decline")}
        disabled={!!loading}
        className="px-3 py-1 rounded-lg text-xs font-semibold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted-light)] hover:border-red-500 hover:text-red-400 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {loading === "decline" ? "Declining…" : "Decline"}
      </button>
      {error && <p className="text-xs text-red-400 self-center">{error}</p>}
    </div>
  );
}

function NotifCard({
  notification,
  onResponded,
}: {
  notification: Notification;
  onResponded: (id: string) => void;
}) {
  const isGroupInvite = notification.type === "group_invite";

  const inner = (
    <div className={`flex items-start gap-3 bg-[var(--surface)] border rounded-xl px-4 py-3 transition-colors hover:border-teal-600/50 ${!notification.read ? "border-teal-600/30" : "border-[var(--border)]"} ${!isGroupInvite ? "cursor-pointer" : ""}`}>
      <span className="text-2xl shrink-0 mt-0.5">{TYPE_ICON[notification.type] ?? "🔔"}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${!notification.read ? "text-[var(--foreground)]" : "text-[var(--muted-light)]"}`}>{notification.title}</p>
        <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">{notification.body}</p>
        <p className="text-xs text-[var(--muted)] mt-1">{new Date(notification.created_at).toLocaleDateString()}</p>
        {isGroupInvite && <GroupInviteActions notification={notification} onResponded={onResponded} />}
      </div>
      {!notification.read && !isGroupInvite && <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0 mt-1.5" />}
    </div>
  );

  if (!isGroupInvite && notification.action_url) {
    return <Link href={notification.action_url}>{inner}</Link>;
  }
  return inner;
}

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const [responded, setResponded] = useState<Set<string>>(new Set());

  function onResponded(id: string) {
    setResponded((prev) => new Set([...prev, id]));
  }

  const visible = notifications.filter((n) => !responded.has(n.id) || n.type !== "group_invite");

  return (
    <div className="space-y-2">
      {visible.map((n) => (
        <NotifCard key={n.id} notification={n} onResponded={onResponded} />
      ))}
    </div>
  );
}
