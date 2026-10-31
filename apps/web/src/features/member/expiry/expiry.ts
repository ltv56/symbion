import type { Lot } from './useLots';

const DAY_MS = 86_400_000;
// Points that expire within this many days count as expiring soon
export const EXPIRING_SOON_DAYS = 60;

function daysLeft(expiresAt: string, loadedAt: number): number {
  return Math.max(
    1,
    Math.ceil((new Date(expiresAt).getTime() - loadedAt) / DAY_MS),
  );
}

export function daysOf(lot: Lot, loadedAt: number): number | null {
  return lot.expiresAt ? daysLeft(lot.expiresAt, loadedAt) : null;
}

export function isSoon(lot: Lot, loadedAt: number): boolean {
  const days = daysOf(lot, loadedAt);
  return days !== null && days <= EXPIRING_SOON_DAYS;
}

// Lots that never expire go last
export function byExpiry(a: Lot, b: Lot): number {
  if (a.expiresAt === null) return 1;
  if (b.expiresAt === null) return -1;
  return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
}
