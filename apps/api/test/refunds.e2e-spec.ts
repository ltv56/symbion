import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('Refunds', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let merchantId: number;
  let memberId: number;
  const apiKey = 'test-api-key';
  const otherApiKey = 'other-api-key';
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
    await dataSource.query('DELETE FROM refunds');
    await dataSource.query('DELETE FROM redemptions');
    await dataSource.query('DELETE FROM vouchers');
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM ledger_lots');
    await dataSource.query('DELETE FROM members');
    await dataSource.query('DELETE FROM tiers');
    await dataSource.query('DELETE FROM merchants');
    const merchant = await dataSource.query(
      `INSERT INTO merchants (name, api_key_hash) VALUES ('Shop A', ?)`,
      [createHash('sha256').update(apiKey).digest('hex')],
    );
    merchantId = Number(merchant.insertId);
    await dataSource.query(
      `INSERT INTO merchants (name, api_key_hash) VALUES ('Shop B', ?)`,
      [createHash('sha256').update(otherApiKey).digest('hex')],
    );
    const tier = await dataSource.query(
      `INSERT INTO tiers (name, min_points, earn_rate) VALUES ('Bronze', 0, 1.00)`,
    );
    const member = await dataSource.query(
      `INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, ?, 'Test')`,
      [merchantId, Number(tier.insertId), memberEmail],
    );
    memberId = Number(member.insertId);
  });

  afterAll(async () => {
    await app.close();
  });

  let keySeq = 0;

  // 1 point per 10,000 VND at Bronze.
  const placeOrder = async (amount: number): Promise<number> => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('x-api-key', apiKey)
      .set('Idempotency-Key', `order-${++keySeq}`)
      .send({ memberEmail, amount })
      .expect(201);
    return Number(res.body.id);
  };

  const spendPoints = async (points: number) => {
    const voucher = await dataSource.query(
      `INSERT INTO vouchers (merchant_id, title, face_value, points_price, stock, valid_until, status)
      VALUES (?, 'Coffee', 50000, ?, 10, ?, 'active')`,
      [merchantId, points, new Date(Date.now() + 86_400_000)],
    );
    await redeem(Number(voucher.insertId)).expect(201);
    return Number(voucher.insertId);
  };

  const redeem = (voucherId: number) =>
    request(app.getHttpServer())
      .post('/redemptions')
      .set('x-api-key', apiKey)
      .set('Idempotency-Key', `redeem-${++keySeq}`)
      .send({ memberEmail, voucherId });

  // key null sends no Idempotency-Key header.
  const refund = (
    orderId: number,
    body: object,
    {
      key = `refund-${++keySeq}`,
      merchantKey = apiKey,
    }: { key?: string | null; merchantKey?: string } = {},
  ) => {
    const req = request(app.getHttpServer())
      .post(`/orders/${orderId}/refunds`)
      .set('x-api-key', merchantKey);
    if (key !== null) req.set('Idempotency-Key', key);
    return req.send(body);
  };

  const balance = async () => {
    const rows = await dataSource.query(
      `SELECT COALESCE(SUM(remaining), 0) AS total FROM ledger_lots
      WHERE member_id = ? AND (expires_at IS NULL OR expires_at > NOW())`,
      [memberId],
    );
    return Number(rows[0].total);
  };

  const refundLots = (): Promise<{ merchant_id: number; points: number }[]> =>
    dataSource.query(
      `SELECT merchant_id, points FROM ledger_lots
      WHERE idempotency_key LIKE 'refund:%'`,
    );

  it('deducts all earned points on a full refund, into a negative balance', async () => {
    const orderId = await placeOrder(250_000);
    await spendPoints(20);
    expect(await balance()).toBe(5);

    const res = await refund(orderId, { amount: 250_000 }).expect(201);

    expect(res.body).toMatchObject({
      merchantId,
      orderId,
      amount: 250_000,
      pointsDeducted: 25,
    });
    expect(await balance()).toBe(-20);
    expect(await refundLots()).toEqual([
      { merchant_id: merchantId, points: -25 },
    ]);
  });

  it('blocks redemption while the balance is negative', async () => {
    const orderId = await placeOrder(250_000);
    await spendPoints(20);
    await placeOrder(10_000);
    await refund(orderId, { amount: 250_000 }).expect(201);
    expect(await balance()).toBe(-19);

    const voucher = await dataSource.query(
      `INSERT INTO vouchers (merchant_id, title, face_value, points_price, stock, valid_until, status)
      VALUES (?, 'Tea', 50000, 1, 10, ?, 'active')`,
      [merchantId, new Date(Date.now() + 86_400_000)],
    );
    await redeem(Number(voucher.insertId)).expect(409);
  });

  it.each([
    { refunded: 100_000, deducted: 10 },
    { refunded: 35_000, deducted: 4 },
    { refunded: 1, deducted: 1 },
  ])(
    'rounds up: refund $refunded of 250,000 deducts $deducted',
    async ({ refunded, deducted }) => {
      const orderId = await placeOrder(250_000);

      const res = await refund(orderId, { amount: refunded }).expect(201);

      expect(res.body.pointsDeducted).toBe(deducted);
      expect(await balance()).toBe(25 - deducted);
    },
  );

  it('deducts nothing for an order that earned no points', async () => {
    const orderId = await placeOrder(5_000);

    const res = await refund(orderId, { amount: 5_000 }).expect(201);

    expect(res.body.pointsDeducted).toBe(0);
    expect(await refundLots()).toHaveLength(0);
  });

  it('returns 404 for an unknown order or another merchant’s order', async () => {
    const orderId = await placeOrder(250_000);

    await refund(orderId + 1000, { amount: 1 }).expect(404);
    await refund(orderId, { amount: 1 }, { merchantKey: otherApiKey }).expect(
      404,
    );
    expect(await balance()).toBe(25);
  });

  it.each([
    { name: 'no Idempotency-Key', body: { amount: 1 }, key: null },
    { name: 'amount 0', body: { amount: 0 }, key: 'k' },
    { name: 'fractional amount', body: { amount: 1.5 }, key: 'k' },
  ])('returns 400 for $name', async ({ body, key }) => {
    const orderId = await placeOrder(250_000);

    await refund(orderId, body, { key }).expect(400);
  });

  it('returns 401 without an API key', async () => {
    await request(app.getHttpServer())
      .post('/orders/1/refunds')
      .set('Idempotency-Key', 'k')
      .send({ amount: 1 })
      .expect(401);
  });
});
