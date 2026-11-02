import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { addMonths } from '../src/common/add-months';
import { insertMerchant, resetDatabase } from './helpers/database';

describe('Tier evaluation', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let merchantId: number;
  let memberId: number;
  const apiKey = 'test-api-key';
  const memberEmail = 'john@example.com';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    merchantId = await insertMerchant(dataSource, apiKey);
    await dataSource.query(
      `INSERT INTO tiers (name, min_spend, earn_rate)
      VALUES ('Bronze', 0, 1.00), ('Silver', 1000000, 1.25), ('Gold', 5000000, 1.50)`,
    );
    const member = await dataSource.query(
      `INSERT INTO members (merchant_id, tier_id, email, name)
      SELECT ?, id, ?, 'John' FROM tiers WHERE name = 'Bronze'`,
      [merchantId, memberEmail],
    );
    memberId = Number(member.insertId);
  });

  afterAll(async () => {
    await app.close();
  });

  let keySeq = 0;
  const order = (amount: number) =>
    request(app.getHttpServer())
      .post('/orders')
      .set('x-api-key', apiKey)
      .set('Idempotency-Key', `o-${++keySeq}`)
      .send({ memberEmail, amount });

  const tierName = async (): Promise<string> => {
    const [row] = await dataSource.query(
      `SELECT t.name FROM members m JOIN tiers t ON t.id = m.tier_id WHERE m.id = ?`,
      [memberId],
    );
    return row.name;
  };

  const pointsOf = async (orderId: number): Promise<number> => {
    const [row] = await dataSource.query(
      `SELECT points FROM ledger_lots WHERE ref_type = 'order' AND ref_id = ?`,
      [orderId],
    );
    return Number(row.points);
  };

  const insertOldOrder = (amount: number, monthsAgo: number) =>
    dataSource.query(
      `INSERT INTO orders (merchant_id, member_id, idempotency_key, amount, created_at)
      VALUES (?, ?, ?, ?, ?)`,
      [
        merchantId,
        memberId,
        `old-${++keySeq}`,
        amount,
        addMonths(new Date(), -monthsAgo),
      ],
    );

  describe('on an order', () => {
    it.each([
      [[999_999], 'Bronze'],
      [[999_999, 1], 'Silver'],
      [[1_000_000], 'Silver'],
      [[4_000_000, 999_999], 'Silver'],
      [[5_000_000], 'Gold'],
    ])('orders %j reach %s', async (amounts, expected) => {
      for (const amount of amounts) {
        await order(amount).expect(201);
      }

      await expect(tierName()).resolves.toBe(expected);
    });

    it('earns at the old tier on the order that crosses the threshold', async () => {
      const first = await order(1_000_000).expect(201);
      const second = await order(1_000_000).expect(201);

      await expect(pointsOf(first.body.id)).resolves.toBe(100);
      await expect(pointsOf(second.body.id)).resolves.toBe(125);
    });

    it('counts only orders from the last 12 months', async () => {
      await insertOldOrder(5_000_000, 13);
      await insertOldOrder(600_000, 11);

      await order(400_000).expect(201);

      await expect(tierName()).resolves.toBe('Silver');
    });

    it('moves down when older orders have left the window', async () => {
      await dataSource.query(
        `UPDATE members SET tier_id = (SELECT id FROM tiers WHERE name = 'Gold') WHERE id = ?`,
        [memberId],
      );
      await insertOldOrder(5_000_000, 13);

      await order(100_000).expect(201);

      await expect(tierName()).resolves.toBe('Bronze');
    });

    it('does not change the tier on a repeated Idempotency-Key', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .set('x-api-key', apiKey)
        .set('Idempotency-Key', 'same')
        .send({ memberEmail, amount: 1_000_000 })
        .expect(201);
      await dataSource.query(
        `UPDATE members SET tier_id = (SELECT id FROM tiers WHERE name = 'Bronze') WHERE id = ?`,
        [memberId],
      );

      await request(app.getHttpServer())
        .post('/orders')
        .set('x-api-key', apiKey)
        .set('Idempotency-Key', 'same')
        .send({ memberEmail, amount: 1_000_000 })
        .expect(200);

      await expect(tierName()).resolves.toBe('Bronze');
    });

    it('sees every parallel order when they cross the threshold together', async () => {
      const responses = await Promise.all(
        Array.from({ length: 10 }, () => order(100_000)),
      );

      expect(responses.every((res) => res.status === 201)).toBe(true);
      await expect(tierName()).resolves.toBe('Silver');
    });
  });

  describe('on a refund', () => {
    const refund = (orderId: number, amount: number) =>
      request(app.getHttpServer())
        .post(`/orders/${orderId}/refunds`)
        .set('x-api-key', apiKey)
        .set('Idempotency-Key', `r-${++keySeq}`)
        .send({ amount });

    it.each([
      [5_000_000, [4_500_000], 'Bronze'],
      [5_000_000, [4_000_001], 'Bronze'],
      [5_000_000, [4_000_000], 'Silver'],
      [6_000_000, [1_000_000], 'Gold'],
      [6_000_000, [500_000, 600_000], 'Silver'],
    ])(
      'an order of %d refunded by %j leaves %s',
      async (amount, refunds, expected) => {
        const { body } = await order(amount).expect(201);
        await expect(tierName()).resolves.toBe('Gold');

        for (const refundAmount of refunds) {
          await refund(body.id, refundAmount).expect(201);
        }

        await expect(tierName()).resolves.toBe(expected);
      },
    );

    it('earns at the lower tier after a refund', async () => {
      const { body } = await order(5_000_000).expect(201);
      await refund(body.id, 5_000_000).expect(201);

      const next = await order(100_000).expect(201);

      await expect(pointsOf(next.body.id)).resolves.toBe(10);
    });

    it('counts refunds only for orders inside the window', async () => {
      await insertOldOrder(2_000_000, 13);
      const [old] = await dataSource.query(
        `SELECT id FROM orders WHERE member_id = ? ORDER BY id LIMIT 1`,
        [memberId],
      );
      await order(1_000_000).expect(201);

      await dataSource.query(
        `INSERT INTO refunds (merchant_id, order_id, idempotency_key, amount, points_deducted)
        VALUES (?, ?, 'old-refund', 2000000, 0)`,
        [merchantId, old.id],
      );
      await order(1).expect(201);

      await expect(tierName()).resolves.toBe('Silver');
    });
  });
});
