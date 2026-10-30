import { EntityManager } from 'typeorm';
import { addMonths } from '../common/add-months';

// Caller holds the member row lock and passes its transaction.
// Spend = orders of the last 12 months minus their refunds. The tier can go up or down.
export async function evaluateTier(
  tx: EntityManager,
  memberId: number,
  now: Date,
): Promise<void> {
  const since = addMonths(now, -12);
  const [spend]: { total: string }[] = await tx.query(
    `SELECT COALESCE(SUM(o.amount), 0)
      - COALESCE((SELECT SUM(r.amount) FROM refunds r WHERE r.order_id IN (
          SELECT id FROM orders WHERE member_id = ? AND created_at > ?)), 0) AS total
    FROM orders o
    WHERE o.member_id = ? AND o.created_at > ?`,
    [memberId, since, memberId, since],
  );

  const [tier]: { id: number }[] = await tx.query(
    `SELECT id FROM tiers WHERE min_spend <= ? ORDER BY min_spend DESC LIMIT 1`,
    [Number(spend?.total ?? 0)],
  );
  if (!tier) {
    return;
  }
  await tx.query(`UPDATE members SET tier_id = ? WHERE id = ?`, [
    tier.id,
    memberId,
  ]);
}
