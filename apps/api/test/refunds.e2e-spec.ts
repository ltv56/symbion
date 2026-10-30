import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { resetDatabase, insertMerchant } from './helpers/database';

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
    await resetDatabase(dataSource);
    merchantId = await insertMerchant(dataSource, apiKey);
    await insertMerchant(dataSource, otherApiKey, 'Shop B');
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
  const placeOrder = async (
    amount: number,
    email = memberEmail,
  ): Promise<number> => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('x-api-key', apiKey)
      .set('Idempotency-Key', `order-${++keySeq}`)
      .send({ memberEmail: email, amount })
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

  const refundCount = async () => {
    const rows = await dataSource.query(
      'SELECT COUNT(*) AS count FROM refunds',
    );
    return Number(rows[0].count);
  };

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

  it('deducts only the difference on a second partial refund', async () => {
    const orderId = await placeOrder(250_000);
    await refund(orderId, { amount: 35_000 }).expect(201);

    // ceil(25 × 70,000 ÷ 250,000) = 7, minus the 4 already deducted (alone it would be 4).
    const res = await refund(orderId, { amount: 35_000 }).expect(201);

    expect(res.body.pointsDeducted).toBe(3);
    expect(await balance()).toBe(18);
  });

  it('deducts exactly the earned points when refunds add up to the order', async () => {
    const orderId = await placeOrder(250_000);

    // Rounding each refund up alone would deduct 9 + 9 + 9 = 27.
    const deducted: number[] = [];
    for (const amount of [83_333, 83_333, 83_334]) {
      const res = await refund(orderId, { amount }).expect(201);
      deducted.push(res.body.pointsDeducted);
    }

    expect(deducted).toEqual([9, 8, 8]);
    expect(await balance()).toBe(0);
  });

  it.each([
    { name: 'one refund', first: undefined, second: 250_001 },
    { name: 'the refunds in total', first: 200_000, second: 50_001 },
  ])(
    'returns 422 when $name exceed the order amount',
    async ({ first, second }) => {
      const orderId = await placeOrder(250_000);
      if (first) await refund(orderId, { amount: first }).expect(201);
      const before = await balance();

      await refund(orderId, { amount: second }).expect(422);

      expect(await balance()).toBe(before);
      expect(await refundCount()).toBe(first ? 1 : 0);
    },
  );

  it('returns the original refund for a repeated Idempotency-Key', async () => {
    const orderId = await placeOrder(250_000);
    const first = await refund(orderId, { amount: 35_000 }, { key: 'same' });

    const again = await refund(orderId, { amount: 35_000 }, { key: 'same' });

    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(first.body.id);
    expect(await balance()).toBe(21);
    expect(await refundLots()).toHaveLength(1);
  });

  it('returns 422 when the Idempotency-Key was used for another refund', async () => {
    const orderId = await placeOrder(250_000);
    const otherOrderId = await placeOrder(100_000);
    await refund(orderId, { amount: 35_000 }, { key: 'same' }).expect(201);

    await refund(orderId, { amount: 1 }, { key: 'same' }).expect(422);
    await refund(otherOrderId, { amount: 35_000 }, { key: 'same' }).expect(422);

    expect(await refundCount()).toBe(1);
    expect(await balance()).toBe(31);
  });

  it('answers 201 and 422, not 500, for one key sent in parallel for two members', async () => {
    const otherEmail = 'jane@example.com';
    await dataSource.query(
      `INSERT INTO members (merchant_id, tier_id, email, name)
      SELECT merchant_id, tier_id, ?, 'Other' FROM members WHERE id = ?`,
      [otherEmail, memberId],
    );
    const orderId = await placeOrder(250_000);
    const otherOrderId = await placeOrder(250_000, otherEmail);

    const responses = await Promise.all([
      refund(orderId, { amount: 35_000 }, { key: 'race' }),
      refund(otherOrderId, { amount: 35_000 }, { key: 'race' }),
    ]);

    expect(responses.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 422,
    ]);
    expect(await refundCount()).toBe(1);
  });

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

  it('never refunds or deducts more than the order for 10 parallel refunds', async () => {
    const orderId = await placeOrder(250_000);

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => refund(orderId, { amount: 30_000 })),
    );

    const statuses = responses.map((r) => r.status).sort((a, b) => a - b);
    expect(statuses).toEqual([...Array(8).fill(201), 422, 422]);
    const [totals] = await dataSource.query(
      `SELECT SUM(amount) AS refunded, SUM(points_deducted) AS deducted
      FROM refunds WHERE order_id = ?`,
      [orderId],
    );
    expect(Number(totals.refunded)).toBe(240_000);
    // ceil(25 × 240,000 ÷ 250,000) = 24
    expect(Number(totals.deducted)).toBe(24);
    const lots = await refundLots();
    expect(lots.reduce((sum, lot) => sum + Number(lot.points), 0)).toBe(-24);
    expect(await balance()).toBe(1);
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
