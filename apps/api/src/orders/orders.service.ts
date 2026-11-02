import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Ledger } from '@symbion/ledger';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  EARNING_STRATEGY,
  type EarningStrategy,
} from '../earning/earning.strategy';
import { addMonths } from '../common/add-months';
import { isDuplicateEntry } from '../common/is-duplicate-entry';
import { evaluateTier } from '../tiers/evaluate-tier';
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
    let memberId: number | undefined;
    try {
      const order = await this.dataSource.transaction(async (tx) => {
        // Lock the member before the order insert, or parallel orders deadlock.
        // Lock alone, read the tier after: the 12-month spend must see earlier orders.
        const [member]: { id: number; tier_id: number }[] = await tx.query(
          `SELECT id, tier_id FROM members WHERE email = ? FOR UPDATE`,
          [memberEmail],
        );
        if (!member) {
          throw new NotFoundException(`Member ${memberEmail} not found`);
        }
        memberId = Number(member.id);
        // tier_id is a FK, so the row exists.
        const [{ multiplier_percent }]: [{ multiplier_percent: number }] =
          await tx.query(
            `SELECT CAST(earn_rate * 100 AS UNSIGNED) AS multiplier_percent
            FROM tiers WHERE id = ?`,
            [member.tier_id],
          );

        // Insert the order, don't look it up by key first: parallel retries would both see "not found".
        const order = await tx.save(Order, {
          merchantId,
          memberId,
          idempotencyKey,
          amount,
        });

        const calculatedPoints = this.earning.calculate({
          amountVnd: amount,
          tierMultiplierPercent: Number(multiplier_percent),
        });
        const points = Math.min(calculatedPoints, this.maxPointsPerOrder);
        const now = new Date();
        if (points > 0) {
          const expiresAt = addMonths(now, 12);
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
        // After earning: this order earns at the tier the member had when it was placed.
        await evaluateTier(tx, memberId, now);
        return order;
      });
      return { order, created: true };
    } catch (error) {
      if (isDuplicateEntry(error, 'uq_orders_merchant_idempotency_key')) {
        const order = await this.orders.findOneByOrFail({
          merchantId,
          idempotencyKey,
        });
        if (
          Number(order.memberId) !== memberId ||
          Number(order.amount) !== amount
        ) {
          throw new UnprocessableEntityException(
            'Idempotency-Key was already used with a different request',
          );
        }
        return { order, created: false };
      }
      throw error;
    }
  }
}
