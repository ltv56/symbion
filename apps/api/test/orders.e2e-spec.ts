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
    expect(Number(res.body.amount)).toBe(120.5);
    const rows = await dataSource.query(
      'SELECT idempotency_key FROM orders WHERE id = ?',
      [res.body.id],
    );
    expect(rows[0].idempotency_key).toBe('order-1');
  });

  it.each([
    ['no idempotency key', undefined, { memberEmail, amount: 10 }],
    ['a missing amount', 'k1', { memberEmail }],
    ['a zero amount', 'k1', { memberEmail, amount: 0 }],
    ['a negative amount', 'k1', { memberEmail, amount: -5 }],
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
});
