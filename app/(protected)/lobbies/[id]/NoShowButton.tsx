"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  lobbyId: string;
  reportedUserId: string;
  reportedUsername: string;
}

export function NoShowButton({ lobbyId, reportedUserId, reportedUsername }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const supabase = createClient();

  async function report() {
    if (!confirm(`Report @${reportedUsername} as a no-show? This will be reviewed by an admin.`)) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    await supabase.from("no_show_reports").insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      lobby_id: lobbyId,
    });
    setDone(true);
    setLoading(false);
  }

  if (done) return <span className="text-xs text-[var(--muted)]">Reported</span>;

  return (
    <button
      onClick={report}
      disabled={loading}
      className="text-xs text-[var(--muted)] hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
      title={`Report @${reportedUsername} as a no-show`}
    >
      {loading ? "..." : "No-show?"}
    </button>
  );
}
