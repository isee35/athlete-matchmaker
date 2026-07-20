export const FREE_GROUP_LIMIT = 1;

// Badge holders get unlimited group memberships
export function getGroupLimit(badge: string | null): number {
  if (badge && ["bronze", "silver", "gold", "ambassador"].includes(badge)) return Infinity;
  return FREE_GROUP_LIMIT;
}
