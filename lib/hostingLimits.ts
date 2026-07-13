export type HostBadge = "bronze" | "silver" | "gold" | "ambassador" | null;

export const BADGE_LABELS: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  ambassador: "Ambassador",
};

export const BADGE_EMOJI: Record<string, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  ambassador: "🌟",
};

// Completed events required to reach each tier
export const BADGE_THRESHOLDS = {
  bronze: 5,
  silver: 15,
  gold: 30,
};

// Max simultaneously open lobbies per tier
export const HOSTING_LIMITS: Record<string, number> = {
  default: 2,
  bronze: 3,
  silver: 5,
  gold: 8,
  ambassador: 999,
};

export function getHostingLimit(badge: HostBadge): number {
  if (!badge) return HOSTING_LIMITS.default;
  return HOSTING_LIMITS[badge] ?? HOSTING_LIMITS.default;
}

export function nextBadge(badge: HostBadge): { badge: string; threshold: number } | null {
  if (!badge) return { badge: "bronze", threshold: BADGE_THRESHOLDS.bronze };
  if (badge === "bronze") return { badge: "silver", threshold: BADGE_THRESHOLDS.silver };
  if (badge === "silver") return { badge: "gold", threshold: BADGE_THRESHOLDS.gold };
  return null; // gold and ambassador have no next tier for badge progression
}

export function canApplyAmbassador(badge: HostBadge): boolean {
  return badge === "silver" || badge === "gold";
}
