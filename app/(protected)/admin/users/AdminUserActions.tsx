"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

export function AdminUserActions({ userId, isFlagged, isAdmin }: { userId: string; isFlagged: boolean; isAdmin: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function toggleFlag() {
    setLoading(true);
    await supabase.from("profiles").update({ soft_flag: !isFlagged }).eq("id", userId);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex gap-2 shrink-0">
      <Button
        variant={isFlagged ? "secondary" : "danger"}
        size="sm"
        loading={loading}
        onClick={toggleFlag}
      >
        {isFlagged ? "Unflag" : "Flag"}
      </Button>
    </div>
  );
}
