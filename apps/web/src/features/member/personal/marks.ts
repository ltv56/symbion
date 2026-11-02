import type { Lot } from '../expiry/useLots';
import type { HistoryEntry } from '../history/useHistory';
import type { MemberRedemption } from '../redemptions/useRedemptions';

export type MarkKind = 'points' | 'code' | 'history';

// One day on the calendar, keyed by kind and id
export interface Mark {
  key: string;
  kind: MarkKind;
  id: number;
  at: string;
  flow?: 'earn' | 'spend';
}

export const markKey = (kind: MarkKind, id: number) => `${kind}:${id}`;

const KIND_ORDER: Record<MarkKind, number> = { points: 0, code: 1, history: 2 };

export function byMark(a: Mark, b: Mark): number {
  if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  return new Date(a.at).getTime() - new Date(b.at).getTime();
}

// Lots with an end, unused codes, ledger entries
export function marksOf(
  lots: Lot[],
  codes: MemberRedemption[],
  history: HistoryEntry[],
  nowMs: number,
): Mark[] {
  const points = lots.flatMap((lot) =>
    lot.expiresAt
      ? [
          {
            key: markKey('points', lot.id),
            kind: 'points' as const,
            id: lot.id,
            at: lot.expiresAt,
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
      at: code.expiresAt,
    }));
  const entries = history.map((entry) => ({
    key: markKey('history', entry.id),
    kind: 'history' as const,
    id: entry.id,
    at: entry.createdAt,
    flow: entry.points > 0 ? ('earn' as const) : ('spend' as const),
  }));
  return [...points, ...vouchers, ...entries].sort(byMark);
}
