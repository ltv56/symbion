import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { adminToken } from './helpers/admin-token';
import { insertMerchant, resetDatabase } from './helpers/database';

describe('Reconciliation', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let shopA: number;
  let shopB: number;
  let memberId: number;
  let seq = 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    token = await adminToken(app);
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    await dataSource.query(
      `UPDATE program_settings SET point_value_vnd = 100 WHERE id = 1`,
    );
    shopA = await insertMerchant(dataSource, 'key-a', 'Shop A');
    shopB = await insertMerchant(dataSource, 'key-b', 'Shop B');
    const tier = await dataSource.query(
      `INSERT INTO tiers (name, min_spend, earn_rate) VALUES ('Bronze', 0, 1.00)`,
    );
    const member = await dataSource.query(
      `INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, 'john@example.com', 'John')`,
      [shopA, Number(tier.insertId)],
    );
    memberId = Number(member.insertId);
  });

  afterAll(async () => {
    await app.close();
  });

  const report = (month: string) =>
    request(app.getHttpServer())
      .get('/reconciliation')
      .query({ month })
      .set('Authorization', `Bearer ${token}`);

  const insertEarn = (merchantId: number, points: number, createdAt: string) =>
    dataSource.query(
      `INSERT INTO ledger_lots (merchant_id, member_id, points, remaining, idempotency_key, type, created_at)
      VALUES (?, ?, ?, ?, ?, 'earn', ?)`,
      [
        merchantId,
        memberId,
        points,
        points,
        `lot-${++seq}`,
        new Date(createdAt),
      ],
    );

  const insertRedemption = async (
    merchantId: number,
    points: number,
    {
      pointValueVnd = 100,
      usedAt = null,
    }: { pointValueVnd?: number; usedAt?: string | null } = {},
  ) => {
    const voucher = await dataSource.query(
      `INSERT INTO vouchers (merchant_id, title, face_value, points_price, stock, valid_until, status)
      VALUES (?, 'Coffee', 500000, ?, 10, '2030-01-01', 'active')`,
      [merchantId, points],
    );
    const n = ++seq;
    await dataSource.query(
      `INSERT INTO redemptions (merchant_id, member_id, voucher_id, code, points, point_value_vnd, status, client_key, used_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '2030-01-01')`,
      [
        merchantId,
        memberId,
        Number(voucher.insertId),
        `CODE${String(n).padStart(6, '0')}`,
        points,
        pointValueVnd,
        usedAt ? 'used' : 'issued',
        `redeem-${n}`,
        usedAt ? new Date(usedAt) : null,
      ],
    );
  };

  const insertRefund = async (
    merchantId: number,
    pointsDeducted: number,
    createdAt: string,
  ) => {
    const n = ++seq;
    const order = await dataSource.query(
      `INSERT INTO orders (merchant_id, member_id, idempotency_key, amount, created_at)
      VALUES (?, ?, ?, 250000, '2026-01-10')`,
      [merchantId, memberId, `order-${n}`],
    );
    await dataSource.query(
      `INSERT INTO refunds (merchant_id, order_id, idempotency_key, amount, points_deducted, created_at)
      VALUES (?, ?, ?, 100000, ?, ?)`,
      [
        merchantId,
        Number(order.insertId),
        `refund-${n}`,
        pointsDeducted,
        new Date(createdAt),
      ],
    );
  };

  describe('request', () => {
    it('rejects a missing token', async () => {
      await request(app.getHttpServer())
        .get('/reconciliation')
        .query({ month: '2026-10' })
        .expect(401);
    });

    it.each([
      ['missing', undefined],
      ['one-digit month', '2026-1'],
      ['month 13', '2026-13'],
      ['month 00', '2026-00'],
      ['a date', '2026-10-01'],
      ['year before 2000', '1999-12'],
      ['text', 'october'],
    ])('rejects %s month with 400', async (_name, month) => {
      await request(app.getHttpServer())
        .get('/reconciliation')
        .query(month === undefined ? {} : { month })
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('returns no merchants for a month without activity', async () => {
      const res = await report('2026-10').expect(200);

      expect(res.body).toEqual({
        month: '2026-10',
        pointValueVnd: 100,
        merchants: [],
      });
    });
  });

  describe('points issued', () => {
    it('sums earned points per merchant for the month', async () => {
      await insertEarn(shopA, 25, '2026-10-05T03:00:00Z');
      await insertEarn(shopA, 10, '2026-10-20T03:00:00Z');
      await insertEarn(shopB, 7, '2026-10-21T03:00:00Z');
      await insertEarn(shopA, 99, '2026-09-20T03:00:00Z');

      const res = await report('2026-10').expect(200);

      expect(res.body.merchants).toEqual([
        {
          merchantId: shopA,
          merchantName: 'Shop A',
          earnedPoints: 35,
          earnedVnd: 3500,
          refundedPoints: 0,
          refundedVnd: 0,
          redeemedPoints: 0,
          redeemedVnd: 0,
          netVnd: 3500,
        },
        {
          merchantId: shopB,
          merchantName: 'Shop B',
          earnedPoints: 7,
          earnedVnd: 700,
          refundedPoints: 0,
          refundedVnd: 0,
          redeemedPoints: 0,
          redeemedVnd: 0,
          netVnd: 700,
        },
      ]);
    });

    it('uses the current point value', async () => {
      await insertEarn(shopA, 10, '2026-10-05T03:00:00Z');
      await dataSource.query(
        `UPDATE program_settings SET point_value_vnd = 150 WHERE id = 1`,
      );

      const res = await report('2026-10').expect(200);

      expect(res.body.pointValueVnd).toBe(150);
      expect(res.body.merchants[0].earnedVnd).toBe(1500);
    });

    it('ignores spend entries', async () => {
      await dataSource.query(
        `INSERT INTO ledger_lots (merchant_id, member_id, points, remaining, idempotency_key, type, created_at)
        VALUES (?, ?, -40, -40, 'spend-1', 'spend', ?)`,
        [shopA, memberId, new Date('2026-10-05T03:00:00Z')],
      );

      const res = await report('2026-10').expect(200);

      expect(res.body.merchants).toEqual([]);
    });

    // Months follow Asia/Ho_Chi_Minh (UTC+7): October starts at 2026-09-30T17:00:00Z.
    it.each([
      ['2026-09-30T16:59:59Z', '2026-09'],
      ['2026-09-30T17:00:00Z', '2026-10'],
      ['2026-10-31T16:59:59Z', '2026-10'],
      ['2026-10-31T17:00:00Z', '2026-11'],
      ['2026-12-31T17:00:00Z', '2027-01'],
    ])('puts a lot created at %s into %s', async (createdAt, month) => {
      await insertEarn(shopA, 5, createdAt);

      const inMonth = await report(month).expect(200);
      expect(inMonth.body.merchants).toHaveLength(1);

      const other = month === '2026-10' ? '2026-09' : '2026-10';
      const elsewhere = await report(other).expect(200);
      expect(elsewhere.body.merchants).toEqual([]);
    });
  });

  describe('vouchers redeemed', () => {
    it('sums used redemptions at the voucher merchant by confirmation time', async () => {
      await insertRedemption(shopA, 500, { usedAt: '2026-10-05T03:00:00Z' });
      await insertRedemption(shopA, 200, { usedAt: '2026-10-25T03:00:00Z' });
      await insertRedemption(shopA, 900, { usedAt: '2026-09-25T03:00:00Z' });
      await insertRedemption(shopA, 800);
      await insertRedemption(shopB, 300, { usedAt: '2026-10-06T03:00:00Z' });

      const res = await report('2026-10').expect(200);

      expect(res.body.merchants).toEqual([
        expect.objectContaining({
          merchantId: shopA,
          earnedPoints: 0,
          redeemedPoints: 700,
          redeemedVnd: 70000,
          netVnd: -70000,
        }),
        expect.objectContaining({
          merchantId: shopB,
          redeemedPoints: 300,
          redeemedVnd: 30000,
          netVnd: -30000,
        }),
      ]);
    });

    it('values a redemption at the point value it was made with', async () => {
      await insertRedemption(shopA, 100, {
        pointValueVnd: 120,
        usedAt: '2026-10-05T03:00:00Z',
      });
      await dataSource.query(
        `UPDATE program_settings SET point_value_vnd = 150 WHERE id = 1`,
      );

      const res = await report('2026-10').expect(200);

      expect(res.body.merchants[0].redeemedVnd).toBe(12000);
    });

    it.each([
      ['2026-09-30T16:59:59Z', '2026-09'],
      ['2026-09-30T17:00:00Z', '2026-10'],
    ])('puts a code used at %s into %s', async (usedAt, month) => {
      await insertRedemption(shopA, 10, { usedAt });

      const res = await report(month).expect(200);

      expect(res.body.merchants).toHaveLength(1);
    });

    it('nets earned points against redeemed ones for a merchant', async () => {
      await insertEarn(shopA, 1000, '2026-10-05T03:00:00Z');
      await insertRedemption(shopA, 400, { usedAt: '2026-10-07T03:00:00Z' });

      const res = await report('2026-10').expect(200);

      expect(res.body.merchants).toEqual([
        expect.objectContaining({
          earnedVnd: 100000,
          redeemedVnd: 40000,
          netVnd: 60000,
        }),
      ]);
    });
  });

  describe('refunds', () => {
    it('subtracts the points deducted by refunds in the month', async () => {
      await insertEarn(shopA, 1000, '2026-10-05T03:00:00Z');
      await insertRefund(shopA, 150, '2026-10-12T03:00:00Z');
      await insertRefund(shopA, 50, '2026-10-13T03:00:00Z');
      await insertRefund(shopA, 999, '2026-09-13T03:00:00Z');

      const res = await report('2026-10').expect(200);

      expect(res.body.merchants).toEqual([
        expect.objectContaining({
          earnedPoints: 1000,
          refundedPoints: 200,
          refundedVnd: 20000,
          netVnd: 80000,
        }),
      ]);
    });

    it('counts a late refund in the month it was made', async () => {
      await insertEarn(shopA, 100, '2026-09-05T03:00:00Z');
      await insertRefund(shopA, 40, '2026-10-02T03:00:00Z');

      const september = await report('2026-09').expect(200);
      const october = await report('2026-10').expect(200);

      expect(september.body.merchants[0]).toEqual(
        expect.objectContaining({ earnedVnd: 10000, netVnd: 10000 }),
      );
      expect(october.body.merchants).toEqual([
        expect.objectContaining({
          earnedPoints: 0,
          refundedPoints: 40,
          netVnd: -4000,
        }),
      ]);
    });

    it('omits a refund that deducted no points', async () => {
      await insertRefund(shopA, 0, '2026-10-12T03:00:00Z');

      const res = await report('2026-10').expect(200);

      expect(res.body.merchants).toEqual([]);
    });

    it('combines issued, refunded and redeemed points', async () => {
      await insertEarn(shopA, 1000, '2026-10-05T03:00:00Z');
      await insertRefund(shopA, 100, '2026-10-06T03:00:00Z');
      await insertRedemption(shopA, 300, { usedAt: '2026-10-07T03:00:00Z' });

      const res = await report('2026-10').expect(200);

      expect(res.body.merchants).toEqual([
        {
          merchantId: shopA,
          merchantName: 'Shop A',
          earnedPoints: 1000,
          earnedVnd: 100000,
          refundedPoints: 100,
          refundedVnd: 10000,
          redeemedPoints: 300,
          redeemedVnd: 30000,
          netVnd: 60000,
        },
      ]);
    });
  });

  describe('through the API', () => {
    // The month in which the requests below are recorded, in Asia/Ho_Chi_Minh.
    const currentMonth = () =>
      new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 7);

    it('reports an order, a confirmed voucher and a refund', async () => {
      const server = app.getHttpServer();
      const voucher = await dataSource.query(
        `INSERT INTO vouchers (merchant_id, title, face_value, points_price, stock, valid_until, status)
        VALUES (?, 'Coffee', 50000, 500, 10, ?, 'active')`,
        [shopB, new Date(Date.now() + 86_400_000)],
      );
      // 1 point per 10,000 VND at Bronze: 10,000,000 VND earns 1,000 points.
      const order = await request(server)
        .post('/orders')
        .set('x-api-key', 'key-a')
        .set('Idempotency-Key', 'order-1')
        .send({ memberEmail: 'john@example.com', amount: 10_000_000 })
        .expect(201);
      const redemption = await request(server)
        .post('/redemptions')
        .set('x-api-key', 'key-a')
        .set('Idempotency-Key', 'redeem-1')
        .send({
          memberEmail: 'john@example.com',
          voucherId: Number(voucher.insertId),
        })
        .expect(201);
      await request(server)
        .post(`/redemptions/${redemption.body.code}/confirm`)
        .set('x-api-key', 'key-b')
        .expect(200);
      // 2,000,000 of 10,000,000 refunded: ceil(1000 x 0.2) = 200 points.
      await request(server)
        .post(`/orders/${order.body.id}/refunds`)
        .set('x-api-key', 'key-a')
        .set('Idempotency-Key', 'refund-1')
        .send({ amount: 2_000_000 })
        .expect(201);

      const res = await report(currentMonth()).expect(200);

      expect(res.body.merchants).toEqual([
        expect.objectContaining({
          merchantId: shopA,
          earnedPoints: 1000,
          refundedPoints: 200,
          redeemedPoints: 0,
          netVnd: 80000,
        }),
        expect.objectContaining({
          merchantId: shopB,
          earnedPoints: 0,
          redeemedPoints: 500,
          redeemedVnd: 50000,
          netVnd: -50000,
        }),
      ]);
    });
  });
});
