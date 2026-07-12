"use client";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

interface SentInvite { username: string; first_name?: string }

export function GroupInvitePanel({ groupId }: { groupId: string }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentInvite[]>([]);

  async function sendInvite() {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/groups/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: groupId, username: username.trim() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to send invite");
      return;
    }

    setSent((prev) => [...prev, data.invitee]);
    setUsername("");
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Invite to Group</h2>
      <div className="flex gap-2">
        <Input
          placeholder="@username"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && sendInvite()}
          className="flex-1"
        />
        <Button onClick={sendInvite} loading={loading} variant="secondary" size="md">
          Invite
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {sent.map((s) => (
        <p key={s.username} className="text-xs text-teal-400">✓ Invite sent to @{s.username}{s.first_name ? ` (${s.first_name})` : ""}</p>
      ))}
    </div>
  );
}
