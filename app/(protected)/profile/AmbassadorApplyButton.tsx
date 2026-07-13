"use client";
import { useState } from "react";
import { Button } from "@/components/Button";
import { BADGE_EMOJI, BADGE_LABELS, type HostBadge } from "@/lib/hostingLimits";

interface Props { userId: string; badge: HostBadge }

export function AmbassadorApplyButton({ badge }: Props) {
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function apply() {
    setLoading(true);
    await fetch("/api/ambassador/apply", { method: "POST" });
    setLoading(false);
    setApplied(true);
  }

  if (applied) {
    return (
      <p className="text-xs text-teal-400 text-center py-1">
        🌟 Application submitted — we&apos;ll be in touch!
      </p>
    );
  }

  return (
    <div className="border-t border-[var(--border)] pt-3 space-y-1">
      <p className="text-xs text-[var(--muted-light)]">
        As a {badge ? `${BADGE_EMOJI[badge]} ${BADGE_LABELS[badge]}` : ""} host, you&apos;re eligible to apply for the{" "}
        <strong className="text-[var(--foreground)]">🌟 Ambassador Program</strong> — host tournaments, earn rewards, and represent your region.
      </p>
      <Button onClick={apply} loading={loading} variant="secondary" size="sm" className="w-full mt-1">
        Apply to become an Ambassador
      </Button>
    </div>
  );
}
