import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { addMonths } from '../src/common/add-months';
import { resetDatabase, insertMerchant } from './helpers/database';

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
    await resetDatabase(dataSource);
    merchantId = await insertMerchant(dataSource, apiKey);
    const tier = await dataSource.query(
      `INSERT INTO tiers (name, min_spend, earn_rate) VALUES ('Bronze', 0, 1.00)`,
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
    const res = await post('order-1', { memberEmail, amount: 250_000 }).expect(
      201,
    );

    expect(res.body).toMatchObject({ merchantId, memberId, amount: 250_000 });
    const rows = await dataSource.query(
      'SELECT idempotency_key FROM orders WHERE id = ?',
      [res.body.id],
    );
    expect(rows[0].idempotency_key).toBe('order-1');
  });

  it.each([
    ['1 VND', 1],
    ['the maximum', 9_999_999_999],
  ])('accepts %s', async (_label, amount) => {
    const res = await post('k1', { memberEmail, amount }).expect(201);
    expect(res.body.amount).toBe(amount);
    const rows = await dataSource.query(
      'SELECT amount FROM orders WHERE id = ?',
      [res.body.id],
    );
    expect(Number(rows[0].amount)).toBe(amount);
  });

  it.each([
    ['no idempotency key', undefined, { memberEmail, amount: 10 }],
    ['a missing amount', 'k1', { memberEmail }],
    ['a zero amount', 'k1', { memberEmail, amount: 0 }],
    ['a negative amount', 'k1', { memberEmail, amount: -5 }],
    ['a fractional amount', 'k1', { memberEmail, amount: 120.5 }],
    ['an exponent amount below 1 VND', 'k1', { memberEmail, amount: 1e-9 }],
    ['an amount as a string', 'k1', { memberEmail, amount: '100' }],
    ['an amount over the maximum', 'k1', { memberEmail, amount: 1e10 }],
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

  describe('a reused idempotency key', () => {
    const otherEmail = 'jane@example.com';
    const reusedMessage =
      'Idempotency-Key was already used with a different request';

    beforeEach(async () => {
      const [tier] = await dataSource.query('SELECT id FROM tiers LIMIT 1');
      await dataSource.query(
        `INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, ?, 'Jane Doe')`,
        [merchantId, tier.id, otherEmail],
      );
    });

    const expectOnlyTheFirstOrder = async () => {
      const rows = await dataSource.query(
        'SELECT amount, member_id FROM orders',
      );
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].amount)).toBe(10);
      expect(Number(rows[0].member_id)).toBe(memberId);
    };

    it('returns 422 when the amount differs', async () => {
      await post('k1', { memberEmail, amount: 10 }).expect(201);
      const res = await post('k1', { memberEmail, amount: 99 }).expect(422);
      expect(res.body).toEqual({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: reusedMessage,
      });
      await expectOnlyTheFirstOrder();
    });

    it('awards no points for a rejected request', async () => {
      await post('k1', { memberEmail, amount: 250_000 }).expect(201);
      await post('k1', { memberEmail, amount: 500_000 }).expect(422);

      const rows = await dataSource.query(
        'SELECT points FROM ledger_lots WHERE member_id = ?',
        [memberId],
      );
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].points)).toBe(25);
    });

    it('returns 422 when the member differs', async () => {
      await post('k1', { memberEmail, amount: 10 }).expect(201);
      await post('k1', { memberEmail: otherEmail, amount: 10 }).expect(422);
      await expectOnlyTheFirstOrder();
    });

    it('returns the original order when only the email case differs', async () => {
      const res1 = await post('k1', { memberEmail, amount: 10 }).expect(201);
      const res2 = await post('k1', {
        memberEmail: memberEmail.toUpperCase(),
        amount: 10,
      }).expect(200);
      expect(res2.body.id).toBe(res1.body.id);
    });

    it('returns one 201 and one 422 when different bodies arrive in parallel', async () => {
      const [res1, res2] = await Promise.all([
        post('k1', { memberEmail, amount: 10 }),
        post('k1', { memberEmail, amount: 20 }),
      ]);
      expect([res1.status, res2.status].sort((a, b) => a - b)).toEqual([
        201, 422,
      ]);
      const rows = await dataSource.query('SELECT id FROM orders');
      expect(rows).toHaveLength(1);
    });

    it('returns the original order when the email resolves to the same member', async () => {
      await dataSource.query('UPDATE members SET email = ? WHERE id = ?', [
        'josé@example.com',
        memberId,
      ]);
      const res1 = await post('k1', {
        memberEmail: 'josé@example.com',
        amount: 10,
      }).expect(201);
      const res2 = await post('k1', {
        memberEmail: 'jose@example.com',
        amount: 10,
      }).expect(200);
      expect(res2.body.id).toBe(res1.body.id);
    });
  });

  it('treats idempotency keys that differ only by case as different', async () => {
    const res1 = await post('Order-1', { memberEmail, amount: 10 }).expect(201);
    const res2 = await post('order-1', { memberEmail, amount: 10 }).expect(201);
    expect(res1.body.id).not.toBe(res2.body.id);
    const rows = await dataSource.query('SELECT COUNT(*) as count FROM orders');
    expect(Number(rows[0].count)).toBe(2);
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
    const secondMerchantId = await insertMerchant(
      dataSource,
      secondApiKey,
      'Shop B',
    );
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

  describe('earning points', () => {
    type LotRow = {
      merchant_id: number;
      member_id: number;
      points: number;
      remaining: number;
      expires_at: Date;
      idempotency_key: string;
      type: string;
      ref_type: string | null;
      ref_id: string | null;
    };

    const lots = (): Promise<LotRow[]> =>
      dataSource.query(
        'SELECT * FROM ledger_lots WHERE member_id = ? ORDER BY id',
        [memberId],
      );

    const setEarnRate = (rate: string) =>
      dataSource.query('UPDATE tiers SET earn_rate = ?', [rate]);

    const monthsFromNow = (months: number) => addMonths(new Date(), months);

    it('rejects a negative earn rate (CHECK constraint)', async () => {
      await expect(setEarnRate('-1.25')).rejects.toMatchObject({
        driverError: { code: 'ER_CHECK_CONSTRAINT_VIOLATED' },
      });
    });

    it.each([
      [250_000, '1.00', 25],
      [250_000, '1.25', 31],
      [250_000, '1.50', 37],
      [9_999, '1.50', 1],
    ])(
      'awards points for %i VND at earn rate %s',
      async (amount, rate, points) => {
        await setEarnRate(rate);
        const expectedExpiry = monthsFromNow(12);

        const res = await post('k1', { memberEmail, amount }).expect(201);

        const rows = await lots();
        expect(rows).toHaveLength(1);
        const lot = rows[0]!;
        expect(lot).toMatchObject({
          points,
          remaining: points,
          idempotency_key: `order:${res.body.id}`,
        });
        expect(Number(lot.merchant_id)).toBe(merchantId);
        expect(Number(lot.member_id)).toBe(memberId);
        expect(
          Math.abs(
            new Date(lot.expires_at).getTime() - expectedExpiry.getTime(),
          ),
        ).toBeLessThan(60_000);
      },
    );

    it.each([
      [100_000_000, '1.00'],
      [250_000_000, '1.00'],
      [9_999_999_999, '1.50'],
    ])('caps %i VND at earn rate %s to 10,000 points', async (amount, rate) => {
      await setEarnRate(rate);

      await post('k1', { memberEmail, amount }).expect(201);

      const rows = await lots();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ points: 10_000, remaining: 10_000 });
    });

    it('links the lot to its order', async () => {
      const res = await post('k1', { memberEmail, amount: 250_000 }).expect(
        201,
      );

      const rows = await lots();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ type: 'earn', ref_type: 'order' });
      expect(Number(rows[0]!.ref_id)).toBe(res.body.id);
    });

    it('creates no lot for a 0-point order', async () => {
      await post('k1', { memberEmail, amount: 5_000 }).expect(201);

      expect(await lots()).toHaveLength(0);
    });

    it('awards points once when the same key is sent again', async () => {
      await post('k1', { memberEmail, amount: 250_000 }).expect(201);
      await post('k1', { memberEmail, amount: 250_000 }).expect(200);

      expect(await lots()).toHaveLength(1);
    });

    it('awards every parallel order for one member', async () => {
      const n = 10;

      const responses = await Promise.all(
        Array.from({ length: n }, (_, i) =>
          post(`k${i}`, { memberEmail, amount: 100_000 }),
        ),
      );

      expect(responses.map((res) => res.status)).toEqual(Array(n).fill(201));
      const rows = await lots();
      expect(rows).toHaveLength(n);
      expect(rows.reduce((sum, lot) => sum + Number(lot.points), 0)).toBe(
        n * 10,
      );
    });

    it('awards points once when the same key arrives in parallel', async () => {
      const [res1, res2] = await Promise.all([
        post('k1', { memberEmail, amount: 250_000 }),
        post('k1', { memberEmail, amount: 250_000 }),
      ]);

      expect([res1.status, res2.status].sort((a, b) => a - b)).toEqual([
        200, 201,
      ]);
      expect(await lots()).toHaveLength(1);
    });
  });
});
