import { EntityManager } from 'typeorm';
import { addMonths } from '../common/add-months';

// Orders of the last 12 months minus their refunds, in VND.
export async function spendLast12Months(
  tx: EntityManager,
  memberId: number,
  now: Date,
): Promise<number> {
  const since = addMonths(now, -12);
  const [spend]: { total: string }[] = await tx.query(
    `SELECT COALESCE(SUM(o.amount), 0)
      - COALESCE((SELECT SUM(r.amount) FROM refunds r WHERE r.order_id IN (
          SELECT id FROM orders WHERE member_id = ? AND created_at > ?)), 0) AS total
    FROM orders o
    WHERE o.member_id = ? AND o.created_at > ?`,
    [memberId, since, memberId, since],
  );
  return Number(spend?.total ?? 0);
}
