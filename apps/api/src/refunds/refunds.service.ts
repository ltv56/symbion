import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Ledger } from '@symbion/ledger';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { Refund } from './refund.entity';

type RefundResult = { refund: Refund; created: boolean };

@Injectable()
export class RefundsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: Ledger<EntityManager>,
  ) {}

  async refund(
    merchantId: number,
    orderId: number,
    amount: number,
    idempotencyKey: string,
  ): Promise<RefundResult> {
    try {
      return await this.dataSource.transaction(async (tx) => {
        // Lock order: member first, as in orders and redemptions.
        // Locking read, so no snapshot is taken before the lock.
        const [orderRow]: { member_id: number; amount: number }[] =
          await tx.query(
            `SELECT o.member_id, o.amount
            FROM orders o
            JOIN members m ON m.id = o.member_id
            WHERE o.id = ? AND o.merchant_id = ?
            FOR UPDATE OF m`,
            [orderId, merchantId],
          );
        if (!orderRow) {
          throw new NotFoundException(`Order with id ${orderId} not found`);
        }
        const memberId = Number(orderRow.member_id);
        const orderAmount = Number(orderRow.amount);

        // Before the amount check: repeating the last refund must return 200, not 422.
        const existing = await tx.findOneBy(Refund, {
          merchantId,
          idempotencyKey,
        });
        if (existing) {
          return sameRefundOrThrow(existing, orderId, amount);
        }

        // SUM without GROUP BY always returns one row.
        const [totals]: { refunded: string; deducted: string }[] =
          await tx.query(
            `SELECT COALESCE(SUM(amount), 0) AS refunded,
              COALESCE(SUM(points_deducted), 0) AS deducted
            FROM refunds
            WHERE order_id = ?`,
            [orderId],
          );
        const refundedBefore = Number(totals?.refunded ?? 0);
        const deductedBefore = Number(totals?.deducted ?? 0);

        const totalRefunded = refundedBefore + amount;
        if (totalRefunded > orderAmount) {
          throw new UnprocessableEntityException(
            'Total refund amount exceeds the order amount',
          );
        }

        const [earnLot]: { points: number }[] = await tx.query(
          `SELECT points FROM ledger_lots WHERE ref_type = 'order' AND ref_id = ?`,
          [orderId],
        );
        const earned = Number(earnLot?.points ?? 0);

        // Cumulative: ceil(earned × totalRefunded ÷ orderAmount) − deducted before.
        // BigInt: the product can pass 2^53.
        const orderAmountBig = BigInt(orderAmount);
        const deductedTotal = Number(
          (BigInt(earned) * BigInt(totalRefunded) + orderAmountBig - 1n) /
            orderAmountBig,
        );
        const pointsDeducted = deductedTotal - deductedBefore;

        const refund = await tx.save(
          tx.create(Refund, {
            merchantId,
            orderId,
            idempotencyKey,
            amount,
            pointsDeducted,
          }),
        );
        refund.id = Number(refund.id);

        if (pointsDeducted > 0) {
          await this.ledger.spend(tx, {
            merchantId: String(merchantId),
            memberId: String(memberId),
            points: pointsDeducted,
            idempotencyKey: `refund:${refund.id}`,
            now: new Date(),
          });
        }
        return { refund, created: true };
      });
    } catch (error) {
      // Same key on another member's order is not serialised by the member lock.
      if (isDuplicateRefundKey(error)) {
        const existing = await this.dataSource.manager.findOneByOrFail(Refund, {
          merchantId,
          idempotencyKey,
        });
        return sameRefundOrThrow(existing, orderId, amount);
      }
      throw error;
    }
  }
}

function sameRefundOrThrow(
  refund: Refund,
  orderId: number,
  amount: number,
): RefundResult {
  if (Number(refund.orderId) !== orderId || Number(refund.amount) !== amount) {
    throw new UnprocessableEntityException(
      'Idempotency-Key was already used with a different request',
    );
  }
  return { refund, created: false };
}

function isDuplicateRefundKey(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as {
    code?: string;
    sqlMessage?: string;
  };
  return (
    driverError.code === 'ER_DUP_ENTRY' &&
    (driverError.sqlMessage?.includes('uq_refunds_merchant_idempotency_key') ??
      false)
  );
}
