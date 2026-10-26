import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('Orders', () => {
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
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM members');
    await dataSource.query('DELETE FROM tiers');
    await dataSource.query('DELETE FROM merchants');
    const merchant = await dataSource.query(
      `INSERT INTO merchants (name, api_key_hash) VALUES ('Shop A', ?)`,
      [createHash('sha256').update(apiKey).digest('hex')],
    );
    merchantId = Number(merchant.insertId);
    const tier = await dataSource.query(
      `INSERT INTO tiers (name, min_points, earn_rate) VALUES ('Bronze', 0, 1.00)`,
    );
    const member = await dataSource.query(
      `INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, ?, 'John Doe')`,
      [merchantId, Number(tier.insertId), memberEmail],
    );
    memberId = Number(member.insertId);
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (
    key: string | undefined,
    body: object,
    apiKeyHeader = apiKey,
  ) => {
    const req = request(app.getHttpServer())
      .post('/orders')
      .set('x-api-key', apiKeyHeader);
    if (key) req.set('Idempotency-Key', key);
    return req.send(body);
  };

  it('creates an order for a member', async () => {
    const res = await post('order-1', { memberEmail, amount: 120.5 }).expect(
      201,
    );

    expect(res.body).toMatchObject({ merchantId, memberId });
    expect(res.body.amount).toBe('120.50');
    const rows = await dataSource.query(
      'SELECT idempotency_key FROM orders WHERE id = ?',
      [res.body.id],
    );
    expect(rows[0].idempotency_key).toBe('order-1');
  });

  it.each([
    ['one cent', 0.01, '0.01'],
    ['the column maximum', 9_999_999_999.99, '9999999999.99'],
  ])('accepts %s', async (_label, amount, stored) => {
    const res = await post('k1', { memberEmail, amount }).expect(201);
    expect(res.body.amount).toBe(stored);
  });

  it.each([
    ['no idempotency key', undefined, { memberEmail, amount: 10 }],
    ['a missing amount', 'k1', { memberEmail }],
    ['a zero amount', 'k1', { memberEmail, amount: 0 }],
    ['a negative amount', 'k1', { memberEmail, amount: -5 }],
    ['an amount below one cent', 'k1', { memberEmail, amount: 0.004 }],
    ['an amount with three decimals', 'k1', { memberEmail, amount: 10.005 }],
    ['an exponent amount below one cent', 'k1', { memberEmail, amount: 1e-9 }],
    ['an amount over the column limit', 'k1', { memberEmail, amount: 1e10 }],
    ['an invalid email', 'k1', { memberEmail: 'nope', amount: 10 }],
    [
      'a merchantId in the body',
      'k1',
      { memberEmail, amount: 10, merchantId: 1 },
    ],
  ])('returns 400 for %s', async (_label, key, body) => {
    await post(key, body).expect(400);
  });

  it.each([
    ['no api key', ''],
    ['an unknown api key', 'wrong-key'],
  ])('returns 401 for %s', async (_label, key) => {
    const req = request(app.getHttpServer()).post('/orders');
    if (key) req.set('x-api-key', key);
    await req
      .set('Idempotency-Key', 'k1')
      .send({ memberEmail, amount: 10 })
      .expect(401);
  });

  it('returns 404 for an unknown member', async () => {
    await post('k1', { memberEmail: 'ghost@example.com', amount: 10 }).expect(
      404,
    );
  });

  it('returns the original order when the same key is sent again', async () => {
    const res1 = await post('k1', { memberEmail, amount: 10 }).expect(201);
    const res2 = await post('k1', { memberEmail, amount: 10 }).expect(200);
    expect(res1.body.id).toBe(res2.body.id);
    const rows = await dataSource.query('SELECT COUNT(*) as count FROM orders');
    expect(Number(rows[0].count)).toBe(1);
  });

  it('creates one order when the same key arrives in parallel', async () => {
    const [res1, res2] = await Promise.all([
      post('k1', { memberEmail, amount: 10 }),
      post('k1', { memberEmail, amount: 10 }),
    ]);
    expect([res1.status, res2.status].sort((a, b) => a - b)).toEqual([
      200, 201,
    ]);
    expect(res1.body.id).toBe(res2.body.id);
    const rows = await dataSource.query('SELECT COUNT(*) as count FROM orders');
    expect(Number(rows[0].count)).toBe(1);
  });

  it('allows two merchants to reuse the same key', async () => {
    const secondApiKey = 'test-api-key-2';
    const secondMerchant = await dataSource.query(
      `INSERT INTO merchants (name, api_key_hash) VALUES ('Shop B', ?)`,
      [createHash('sha256').update(secondApiKey).digest('hex')],
    );
    const secondMerchantId = Number(secondMerchant.insertId);
    const res1 = await post('k1', { memberEmail, amount: 10 }).expect(201);
    const res2 = await post(
      'k1',
      { memberEmail, amount: 10 },
      secondApiKey,
    ).expect(201);

    expect(res1.body.merchantId).toBe(merchantId);
    expect(res2.body.merchantId).toBe(secondMerchantId);
    expect(res1.body.id).not.toBe(res2.body.id);

    const rows = await dataSource.query('SELECT COUNT(*) as count FROM orders');
    expect(Number(rows[0].count)).toBe(2);
  });
});
