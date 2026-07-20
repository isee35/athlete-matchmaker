export type SubscriptionTier = "free" | "basic" | "pro";

export const TIER_PRICES: Record<string, { monthly: number; label: string }> = {
  basic: { monthly: 1.99, label: "Basic" },
  pro:   { monthly: 4.99, label: "Pro" },
};

// Per-tier limits
export const TIER_LIMITS: Record<SubscriptionTier, {
  canCreateGroups: boolean;
  ownedGroupsMax: number;   // groups you can own/create
  memberOfMax: number;      // total group memberships (Infinity = unlimited)
}> = {
  free:  { canCreateGroups: false, ownedGroupsMax: 0,        memberOfMax: 1 },
  basic: { canCreateGroups: true,  ownedGroupsMax: 1,        memberOfMax: 5 },
  pro:   { canCreateGroups: true,  ownedGroupsMax: Infinity, memberOfMax: Infinity },
};

export function getTierLimits(tier: SubscriptionTier | string | null) {
  return TIER_LIMITS[(tier as SubscriptionTier) ?? "free"] ?? TIER_LIMITS.free;
}

// Friendly upgrade message for group membership limit
export function memberLimitMessage(tier: SubscriptionTier | string | null): string {
  if (!tier || tier === "free") {
    return "Free accounts can join 1 group. Upgrade to Basic ($1.99/mo) to join up to 5 groups.";
  }
  if (tier === "basic") {
    return "Basic accounts can join up to 5 groups. Upgrade to Pro ($4.99/mo) for unlimited groups.";
  }
  return "";
}

// Friendly upgrade message for group creation limit
export function createLimitMessage(tier: SubscriptionTier | string | null): string {
  if (!tier || tier === "free") {
    return "Free accounts cannot create groups. Upgrade to Basic ($1.99/mo) to create your first group.";
  }
  if (tier === "basic") {
    return "Basic accounts can own 1 group. Upgrade to Pro ($4.99/mo) to create unlimited groups.";
  }
  return "";
}
