"use client";
import { Button } from "@/components/Button";
import {
  BADGE_EMOJI,
  BADGE_LABELS,
  HOSTING_LIMITS,
  BADGE_THRESHOLDS,
  type HostBadge,
} from "@/lib/hostingLimits";

interface Props {
  badge: HostBadge;
  limit: number;
  openCount: number;
  purchasedSlots: number;
  onPaySlot: () => void;
  onClose: () => void;
  paying: boolean;
}

const TIERS: { key: string; label: string; threshold: number | null; limit: number }[] = [
  { key: "default", label: "No badge", threshold: null, limit: HOSTING_LIMITS.default },
  { key: "bronze",  label: "Bronze",   threshold: BADGE_THRESHOLDS.bronze, limit: HOSTING_LIMITS.bronze },
  { key: "silver",  label: "Silver",   threshold: BADGE_THRESHOLDS.silver, limit: HOSTING_LIMITS.silver },
  { key: "gold",    label: "Gold",     threshold: BADGE_THRESHOLDS.gold,   limit: HOSTING_LIMITS.gold },
  { key: "ambassador", label: "Ambassador", threshold: null, limit: HOSTING_LIMITS.ambassador },
];

export function HostingLimitModal({ badge, limit, openCount, purchasedSlots, onPaySlot, onClose, paying }: Props) {
  const badgeKey = badge ?? "default";
  const badgeLabel = badge ? `${BADGE_EMOJI[badge]} ${BADGE_LABELS[badge]}` : "No badge yet";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <p className="text-xs text-yellow-400 font-medium uppercase tracking-wider mb-1">Hosting limit reached</p>
          <h2 className="text-lg font-black">You have {openCount} open {openCount === 1 ? "lobby" : "lobbies"}</h2>
          <p className="text-sm text-[var(--muted-light)] mt-1">
            Your current tier ({badgeLabel}) allows up to {limit} open {limit === 1 ? "lobby" : "lobbies"} at a time.
          </p>
        </div>

        {/* Tier ladder */}
        <div className="px-5 py-4 space-y-2">
          <p className="text-xs text-[var(--muted)] font-medium uppercase tracking-wider mb-3">Hosting tiers</p>
          {TIERS.map((tier) => {
            const isActive = tier.key === badgeKey;
            const limitDisplay = tier.limit >= 999 ? "Unlimited" : `${tier.limit} open`;
            return (
              <div
                key={tier.key}
                className={`flex items-center justify-between rounded-xl px-3 py-2 border text-sm ${
                  isActive
                    ? "bg-teal-600/10 border-teal-500/40 text-[var(--foreground)]"
                    : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)]"
                }`}
              >
                <span className="font-medium">
                  {tier.key !== "default" && tier.key !== "ambassador" ? `${BADGE_EMOJI[tier.key]} ` : ""}
                  {tier.label}
                  {tier.threshold && ` · ${tier.threshold} hosted events`}
                  {tier.key === "ambassador" && " · Admin-granted"}
                </span>
                <span className={`text-xs font-semibold ${isActive ? "text-teal-400" : ""}`}>{limitDisplay}</span>
              </div>
            );
          })}
        </div>

        {/* Pay option */}
        <div className="px-5 pb-5 space-y-3">
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold">Need one more slot now?</p>
            <p className="text-xs text-[var(--muted-light)]">
              Pay $1.99 to unlock one extra lobby slot. It&apos;s consumed when you create the lobby.
              {purchasedSlots > 0 && (
                <span className="text-teal-400"> You have {purchasedSlots} purchased slot{purchasedSlots !== 1 ? "s" : ""} available.</span>
              )}
            </p>
            <Button
              onClick={onPaySlot}
              loading={paying}
              variant="secondary"
              size="md"
              className="w-full mt-1"
            >
              {purchasedSlots > 0 ? `Use purchased slot (${purchasedSlots} left)` : "Pay $1.99 for an extra slot"}
            </Button>
            {purchasedSlots === 0 && (
              <p className="text-xs text-[var(--muted)] text-center">Stripe payment coming soon</p>
            )}
          </div>

          <Button onClick={onClose} variant="ghost" size="md" className="w-full text-[var(--muted)]">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
