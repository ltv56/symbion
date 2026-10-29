import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Ledger } from '@symbion/ledger';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import {
  EARNING_STRATEGY,
  type EarningStrategy,
} from '../earning/earning.strategy';
import { Order } from './order.entity';
import { MAX_POINTS_PER_ORDER } from './orders.config';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly ledger: Ledger<EntityManager>,
    @Inject(EARNING_STRATEGY) private readonly earning: EarningStrategy,
    @Inject(MAX_POINTS_PER_ORDER)
    private readonly maxPointsPerOrder: number,
  ) {}

  async create(
    merchantId: number,
    idempotencyKey: string,
    memberEmail: string,
    amount: number,
  ): Promise<{ order: Order; created: boolean }> {
    try {
      const order = await this.dataSource.transaction(async (tx) => {
        // Lock the member before the order insert, or parallel orders deadlock.
        const rows: { id: number; multiplier_percent: number }[] =
          await tx.query(
            `SELECT m.id, CAST(t.earn_rate * 100 AS UNSIGNED) AS multiplier_percent
            FROM members m
            JOIN tiers t ON m.tier_id = t.id
            WHERE m.email = ?
            FOR UPDATE OF m`,
            [memberEmail],
          );
        const row = rows[0];
        if (!row) {
          throw new NotFoundException(`Member ${memberEmail} not found`);
        }
        const memberId = Number(row.id);

        // Insert the order, don't look it up by key first: parallel retries would both see "not found".
        const order = await tx.save(Order, {
          merchantId,
          memberId,
          idempotencyKey,
          amount,
        });

        const calculatedPoints = this.earning.calculate({
          amountVnd: amount,
          tierMultiplierPercent: Number(row.multiplier_percent),
        });
        const points = Math.min(calculatedPoints, this.maxPointsPerOrder);
        if (points > 0) {
          const now = new Date();
          const expiresAt = new Date(now);
          expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 12);
          await this.ledger.earn(tx, {
            merchantId: String(merchantId),
            memberId: String(memberId),
            points,
            idempotencyKey: `order:${order.id}`,
            ref: { type: 'order', id: String(order.id) },
            now,
            expiresAt,
          });
        }
        return order;
      });
      return { order, created: true };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
      ) {
        const order = await this.orders.findOneByOrFail({
          merchantId,
          idempotencyKey,
        });
        return { order, created: false };
      }
      throw error;
    }
  }
}
