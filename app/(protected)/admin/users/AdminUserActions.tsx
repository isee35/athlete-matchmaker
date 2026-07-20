"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

const TIER_LABELS: Record<string, string> = { free: "Free", basic: "Basic $1.99", pro: "Pro $4.99" };
const TIER_COLORS: Record<string, string> = {
  free: "text-[var(--muted)]",
  basic: "text-teal-400",
  pro: "text-pink-400",
};

export function AdminUserActions({
  userId,
  isFlagged,
  isAdmin,
  subscriptionTier = "free",
}: {
  userId: string;
  isFlagged: boolean;
  isAdmin: boolean;
  subscriptionTier?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [tierLoading, setTierLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function toggleFlag() {
    setLoading(true);
    await supabase.from("profiles").update({ soft_flag: !isFlagged }).eq("id", userId);
    router.refresh();
    setLoading(false);
  }

  async function changeTier(tier: string) {
    setTierLoading(true);
    await fetch("/api/admin/set-tier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, tier }),
    });
    router.refresh();
    setTierLoading(false);
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Tier selector */}
      <div className="relative">
        <select
          value={subscriptionTier}
          onChange={(e) => changeTier(e.target.value)}
          disabled={tierLoading}
          className={`appearance-none text-xs px-2 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] cursor-pointer disabled:opacity-50 ${TIER_COLORS[subscriptionTier] ?? "text-[var(--muted)]"}`}
        >
          {Object.entries(TIER_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
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
