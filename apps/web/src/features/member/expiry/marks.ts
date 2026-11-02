import type { Lot } from './useLots';
import type { MemberRedemption } from '../redemptions/useRedemptions';

export type MarkKind = 'points' | 'code';

// One deadline on the calendar, keyed by kind and id
export interface Mark {
  key: string;
  kind: MarkKind;
  id: number;
  expiresAt: string;
}

export const markKey = (kind: MarkKind, id: number) => `${kind}:${id}`;

// Points first, then codes, each by time
export function byMark(a: Mark, b: Mark): number {
  if (a.kind !== b.kind) return a.kind === 'points' ? -1 : 1;
  return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
}

// Lots with an end, and the unused codes
export function marksOf(
  lots: Lot[],
  codes: MemberRedemption[],
  nowMs: number,
): Mark[] {
  const points = lots.flatMap((lot) =>
    lot.expiresAt
      ? [
          {
            key: markKey('points', lot.id),
            kind: 'points' as const,
            id: lot.id,
            expiresAt: lot.expiresAt,
          },
        ]
      : [],
  );
  const vouchers = codes
    .filter(
      (code) =>
        code.status === 'issued' && new Date(code.expiresAt).getTime() > nowMs,
    )
    .map((code) => ({
      key: markKey('code', code.id),
      kind: 'code' as const,
      id: code.id,
      expiresAt: code.expiresAt,
    }));
  return [...points, ...vouchers].sort(byMark);
}
