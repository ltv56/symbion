import type { Voucher } from './useVouchers';

export type Availability =
  | { kind: 'ok' }
  | { kind: 'short'; missing: number }
  | { kind: 'soldOut' }
  | { kind: 'negative' };

// Sold out, then negative balance, then short of points
export function availability(voucher: Voucher, balance: number): Availability {
  if (voucher.stock === 0) return { kind: 'soldOut' };
  if (balance < 0) return { kind: 'negative' };
  if (balance < voucher.pointsPrice) {
    return { kind: 'short', missing: voucher.pointsPrice - balance };
  }
  return { kind: 'ok' };
}

export interface VoucherGroups {
  ready: Voucher[];
  notYet: Voucher[];
  soldOut: Voucher[];
}

// All page filter
export type VoucherFilter = 'all' | keyof VoucherGroups;

// Redeemable first, sold out last, the rest cheapest first (the smallest shortfall)
export function groupVouchers(
  vouchers: Voucher[],
  balance: number,
): VoucherGroups {
  const groups: VoucherGroups = { ready: [], notYet: [], soldOut: [] };
  for (const voucher of vouchers) {
    const { kind } = availability(voucher, balance);
    if (kind === 'ok') groups.ready.push(voucher);
    else if (kind === 'soldOut') groups.soldOut.push(voucher);
    else groups.notYet.push(voucher);
  }
  groups.notYet.sort((a, b) => a.pointsPrice - b.pointsPrice);
  return groups;
}
