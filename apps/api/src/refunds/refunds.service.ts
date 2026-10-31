import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Ledger } from '@symbion/ledger';
import { DataSource, EntityManager } from 'typeorm';
import { isDuplicateEntry } from '../common/is-duplicate-entry';
import { Refund } from './refund.entity';

type RefundResult = { refund: Refund; created: boolean };

const REFUND_WINDOW_DAYS = 90;

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
        // Lock both rows: `OF m` reads `o` plainly and takes the snapshot before the lock.
        const [orderRow]: {
          member_id: number;
          amount: number;
          created_at: Date;
        }[] = await tx.query(
          `SELECT o.member_id, o.amount, o.created_at
          FROM orders o
          JOIN members m ON m.id = o.member_id
          WHERE o.id = ? AND o.merchant_id = ?
          FOR UPDATE`,
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

        // After the key check: repeating an accepted refund stays 200 after the window.
        const deadline =
          orderRow.created_at.getTime() + REFUND_WINDOW_DAYS * 86_400_000;
        if (Date.now() > deadline) {
          throw new ConflictException('Refund window of 90 days has passed');
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
      if (isDuplicateEntry(error, 'uq_refunds_merchant_idempotency_key')) {
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
