import type { AdminVoucher } from './useVouchers';

export type VoucherState = 'live' | 'soldOut' | 'ended' | 'retired';

export function voucherState(voucher: AdminVoucher, now: number): VoucherState {
  if (voucher.status === 'expired') return 'retired';
  if (new Date(voucher.validUntil).getTime() <= now) return 'ended';
  if (voucher.stock === 0) return 'soldOut';
  return 'live';
}
