import type { MemberRedemption } from './useRedemptions';

export interface RedemptionGroups {
  active: MemberRedemption[];
  past: MemberRedemption[];
}

// Unused codes first, the one that ends soonest on top; the rest as the api lists them
export function groupRedemptions(items: MemberRedemption[]): RedemptionGroups {
  const active = items
    .filter((item) => item.status === 'issued')
    .sort(
      (a, b) =>
        new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
    );
  const past = items.filter((item) => item.status !== 'issued');
  return { active, past };
}
