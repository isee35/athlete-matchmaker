"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

export function ReviewReport({ reportId, reportedUserId }: { reportId: string; reportedUserId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function resolve(incrementNoShow: boolean) {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("no_show_reports").update({ reviewed: true, reviewed_by: user!.id }).eq("id", reportId);
    if (incrementNoShow) {
      await supabase.rpc("increment", { row_id: reportedUserId, table_name: "profiles", column_name: "no_show_count" });
      // fallback if RPC not set up:
      const { data: p } = await supabase.from("profiles").select("no_show_count").eq("id", reportedUserId).single();
      await supabase.from("profiles").update({ no_show_count: (p?.no_show_count ?? 0) + 1 }).eq("id", reportedUserId);
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      <Button variant="danger" size="sm" loading={loading} onClick={() => resolve(true)}>Confirm no-show (+1)</Button>
      <Button variant="secondary" size="sm" loading={loading} onClick={() => resolve(false)}>Dismiss</Button>
    </div>
  );
}
