"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function ApproveLobbyButton({ lobbyId }: { lobbyId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function approve() {
    setLoading(true);
    await supabase.from("lobbies").update({ pending_approval: false }).eq("id", lobbyId);
    router.refresh();
  }

  return (
    <button
      onClick={approve}
      disabled={loading}
      className="text-xs bg-teal-900/30 text-teal-400 border border-teal-700/30 px-2 py-0.5 rounded-full hover:bg-teal-900/50 transition-colors disabled:opacity-50"
    >
      {loading ? "…" : "Approve"}
    </button>
  );
}

export function CancelLobbyButton({ lobbyId }: { lobbyId: string }) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function cancel() {
    setLoading(true);
    await supabase.from("lobbies").update({ status: "cancelled" }).eq("id", lobbyId);
    router.refresh();
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={cancel}
          disabled={loading}
          className="text-xs bg-red-900/30 text-red-400 border border-red-700/30 px-2 py-0.5 rounded-full hover:bg-red-900/50 transition-colors"
        >
          {loading ? "…" : "Confirm cancel"}
        </button>
        <button onClick={() => setConfirm(false)} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">✕</button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs text-red-400 hover:text-red-300 transition-colors"
    >
      Cancel
    </button>
  );
}
