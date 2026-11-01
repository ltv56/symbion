import type { QueryClient } from '@tanstack/react-query';
import { DAY_MS } from '@/features/member/expiry/expiry';
import type { Me } from '@/features/member/useMe';
import type { Voucher } from '@/features/member/vouchers/useVouchers';

const CODE_LIFETIME_DAYS = 30;

// 30 days from now, never past the voucher's own end
export function codeExpiresAt(voucher: Voucher, now: number): Date {
  const end = new Date(voucher.validUntil).getTime();
  return new Date(Math.min(now + CODE_LIFETIME_DAYS * DAY_MS, end));
}

export type RedeemView =
  | { kind: 'confirm' }
  | { kind: 'sending' }
  | { kind: 'created'; code: string; expiresAt: string; balanceAfter: number }
  | { kind: 'recorded'; code: string; expiresAt: string }
  | { kind: 'short'; balance: number }
  | { kind: 'soldOut' }
  | { kind: 'gone' }
  | { kind: 'failed' };

// 409 names no rule: read the fresh data
export async function viewAfterConflict(
  client: QueryClient,
  voucher: Voucher,
): Promise<RedeemView> {
  await Promise.all([
    client.refetchQueries({ queryKey: ['me'] }),
    client.refetchQueries({ queryKey: ['vouchers'] }),
  ]);
  const me = client.getQueryData<Me>(['me']);
  const fresh = client
    .getQueryData<Voucher[]>(['vouchers'])
    ?.find((item) => item.id === voucher.id);
  if (!fresh) return { kind: 'gone' };
  if (fresh.stock === 0) return { kind: 'soldOut' };
  if (me && me.balance < fresh.pointsPrice) {
    return { kind: 'short', balance: me.balance };
  }
  return { kind: 'failed' };
}
