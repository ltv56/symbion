import { EntityManager } from 'typeorm';
import { spendLast12Months } from './spend';

// Caller holds the member row lock and passes its transaction.
// The tier follows the 12-month spend and can go up or down.
export async function evaluateTier(
  tx: EntityManager,
  memberId: number,
  now: Date,
): Promise<void> {
  const spend = await spendLast12Months(tx, memberId, now);

  const [tier]: { id: number }[] = await tx.query(
    `SELECT id FROM tiers WHERE min_spend <= ? ORDER BY min_spend DESC LIMIT 1`,
    [spend],
  );
  if (!tier) {
    return;
  }
  await tx.query(`UPDATE members SET tier_id = ? WHERE id = ?`, [
    tier.id,
    memberId,
  ]);
}
