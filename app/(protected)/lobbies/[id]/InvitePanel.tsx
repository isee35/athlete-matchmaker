"use client";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

interface SentInvite {
  username: string;
  first_name?: string;
}

export function InvitePanel({ lobbyId }: { lobbyId: string }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentInvite[]>([]);

  async function sendInvite() {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/lobbies/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lobby_id: lobbyId, username: username.trim() }),
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
      <h2 className="text-base font-semibold">Invite Players</h2>
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

      {sent.length > 0 && (
        <div className="space-y-1">
          {sent.map((s) => (
            <div key={s.username} className="flex items-center gap-2 text-sm text-teal-400">
              <span>✓</span>
              <span>Invite sent to @{s.username}{s.first_name ? ` (${s.first_name})` : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
