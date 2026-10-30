import { Injectable, NotFoundException } from '@nestjs/common';
import { Ledger } from '@symbion/ledger';
import { DataSource, EntityManager } from 'typeorm';
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
    return this.dataSource.transaction(async (tx) => {
      const orderRows: { member_id: number; amount: number }[] = await tx.query(
        `SELECT member_id, amount FROM orders WHERE id = ? AND merchant_id = ?`,
        [orderId, merchantId],
      );
      const orderRow = orderRows[0];
      if (!orderRow) {
        throw new NotFoundException(`Order with id ${orderId} not found`);
      }
      const memberId = Number(orderRow.member_id);
      const orderAmount = Number(orderRow.amount);

      // Lock order: member first, as in orders and redemptions.
      await tx.query(`SELECT id FROM members WHERE id = ? FOR UPDATE`, [
        memberId,
      ]);

      const earnRows: { points: number }[] = await tx.query(
        `SELECT points FROM ledger_lots WHERE ref_type = 'order' AND ref_id = ?`,
        [orderId],
      );
      const earned = earnRows[0] ? Number(earnRows[0].points) : 0;

      // ceil(earned × amount ÷ orderAmount) in BigInt: the product can pass 2^53.
      const orderAmountBig = BigInt(orderAmount);
      const pointsDeducted = Number(
        (BigInt(earned) * BigInt(amount) + orderAmountBig - 1n) /
          orderAmountBig,
      );

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
  }
}
