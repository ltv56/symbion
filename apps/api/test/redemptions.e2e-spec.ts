import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('Redemptions', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let callerMerchantId: number;
  let voucherMerchantId: number;
  let memberId: number;
  let otherMemberId: number;
  const apiKey = 'test-api-key';
  const memberEmail = 'john@example.com';
  const otherMemberEmail = 'jane@example.com';
  const pointsPrice = 500;

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
    const caller = await dataSource.query(
      `INSERT INTO merchants (name, api_key_hash) VALUES ('Shop A', ?)`,
      [createHash('sha256').update(apiKey).digest('hex')],
    );
    callerMerchantId = Number(caller.insertId);
    const owner = await dataSource.query(
      `INSERT INTO merchants (name, api_key_hash) VALUES ('Shop B', ?)`,
      [createHash('sha256').update('other-key').digest('hex')],
    );
    voucherMerchantId = Number(owner.insertId);
    const tier = await dataSource.query(
      `INSERT INTO tiers (name, min_points, earn_rate) VALUES ('Bronze', 0, 1.00)`,
    );
    const insertMember = (email: string) =>
      dataSource.query(
        `INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, ?, 'Test')`,
        [callerMerchantId, Number(tier.insertId), email],
      );
    memberId = Number((await insertMember(memberEmail)).insertId);
    otherMemberId = Number((await insertMember(otherMemberEmail)).insertId);
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (key: string | undefined, body: object) => {
    const req = request(app.getHttpServer())
      .post('/redemptions')
      .set('x-api-key', apiKey);
    if (key) req.set('Idempotency-Key', key);
    return req.send(body);
  };

  // Voucher of Shop B, redeemed through Shop A's key.
  const insertVoucher = async ({
    stock = 10,
    validUntil = new Date(Date.now() + 86_400_000),
    status = 'active',
  } = {}): Promise<number> => {
    const res = await dataSource.query(
      `INSERT INTO vouchers (merchant_id, title, face_value, points_price, stock, valid_until, status)
      VALUES (?, 'Coffee', 50000, ?, ?, ?, ?)`,
      [voucherMerchantId, pointsPrice, stock, validUntil, status],
    );
    return Number(res.insertId);
  };

  let lotSeq = 0;
  const addPoints = (forMemberId: number, points: number) =>
    dataSource.query(
      `INSERT INTO ledger_lots (merchant_id, member_id, points, remaining, idempotency_key, type)
      VALUES (?, ?, ?, ?, ?, 'earn')`,
      [callerMerchantId, forMemberId, points, points, `seed-${++lotSeq}`],
    );

  const addDebt = (forMemberId: number, points: number) =>
    dataSource.query(
      `INSERT INTO ledger_lots (merchant_id, member_id, points, remaining, idempotency_key, type)
      VALUES (?, ?, ?, ?, ?, 'spend')`,
      [callerMerchantId, forMemberId, -points, -points, `seed-${++lotSeq}`],
    );

  const balanceOf = async (forMemberId: number) => {
    const rows = await dataSource.query(
      `SELECT COALESCE(SUM(remaining), 0) AS total FROM ledger_lots
      WHERE member_id = ? AND (expires_at IS NULL OR expires_at > NOW())`,
      [forMemberId],
    );
    return Number(rows[0].total);
  };

  const stockOf = async (voucherId: number) => {
    const rows = await dataSource.query(
      'SELECT stock FROM vouchers WHERE id = ?',
      [voucherId],
    );
    return Number(rows[0].stock);
  };

  const redemptionSpends = (): Promise<
    { merchant_id: string; points: string; idempotency_key: string }[]
  > =>
    dataSource.query(
      `SELECT merchant_id, points, idempotency_key FROM ledger_lots
      WHERE idempotency_key LIKE 'redemption:%'`,
    );

  const redemptionCount = async () => {
    const rows = await dataSource.query(
      'SELECT COUNT(*) AS count FROM redemptions',
    );
    return Number(rows[0].count);
  };

  const countStatuses = (responses: { status: number }[]) =>
    responses.reduce<Record<number, number>>((acc, { status }) => {
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});

  it('redeems a voucher', async () => {
    const voucherId = await insertVoucher();
    await addPoints(memberId, 800);

    const res = await post('r1', { memberEmail, voucherId }).expect(201);

    expect(res.body).toMatchObject({
      memberId,
      voucherId,
      merchantId: voucherMerchantId,
      points: pointsPrice,
      pointValueVnd: 100,
      status: 'issued',
    });
    expect(res.body.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/);
    await expect(balanceOf(memberId)).resolves.toBe(300);
    await expect(stockOf(voucherId)).resolves.toBe(9);
    const spends = await redemptionSpends();
    expect(spends).toHaveLength(1);
    expect(spends[0]).toMatchObject({
      idempotency_key: `redemption:${res.body.id}`,
    });
    expect(Number(spends[0]?.points)).toBe(-pointsPrice);
    expect(Number(spends[0]?.merchant_id)).toBe(voucherMerchantId);
  });

  it.each<
    [string, () => Promise<{ voucherId: number; email?: string }>, number]
  >([
    [
      'not enough points',
      async () => {
        await addPoints(memberId, 499);
        return { voucherId: await insertVoucher() };
      },
      409,
    ],
    [
      'a negative balance',
      async () => {
        await addDebt(memberId, 100);
        return { voucherId: await insertVoucher() };
      },
      409,
    ],
    [
      'no stock left',
      async () => {
        await addPoints(memberId, 800);
        return { voucherId: await insertVoucher({ stock: 0 }) };
      },
      409,
    ],
    [
      'a voucher past valid_until',
      async () => {
        await addPoints(memberId, 800);
        return {
          voucherId: await insertVoucher({
            validUntil: new Date(Date.now() - 60_000),
          }),
        };
      },
      404,
    ],
    [
      "a voucher with status 'expired'",
      async () => {
        await addPoints(memberId, 800);
        return { voucherId: await insertVoucher({ status: 'expired' }) };
      },
      404,
    ],
    [
      'an unknown voucher',
      async () => {
        await addPoints(memberId, 800);
        return { voucherId: 999_999 };
      },
      404,
    ],
    [
      'an unknown member',
      async () => ({
        voucherId: await insertVoucher(),
        email: 'nobody@example.com',
      }),
      404,
    ],
  ])(
    'returns an error for %s and changes nothing',
    async (_label, arrange, status) => {
      const { voucherId, email } = await arrange();
      const balanceBefore = await balanceOf(memberId);
      const stockBefore =
        voucherId === 999_999 ? undefined : await stockOf(voucherId);

      await post('r1', { memberEmail: email ?? memberEmail, voucherId }).expect(
        status,
      );

      await expect(balanceOf(memberId)).resolves.toBe(balanceBefore);
      if (stockBefore !== undefined) {
        await expect(stockOf(voucherId)).resolves.toBe(stockBefore);
      }
      await expect(redemptionCount()).resolves.toBe(0);
    },
  );

  it.each([
    ['no Idempotency-Key', undefined, { memberEmail, voucherId: 1 }],
    ['an invalid email', 'r1', { memberEmail: 'nope', voucherId: 1 }],
    ['a voucherId of 0', 'r1', { memberEmail, voucherId: 0 }],
    ['a voucherId as a string', 'r1', { memberEmail, voucherId: '1' }],
  ])('returns 400 for %s', async (_label, key, body) => {
    await post(key, body).expect(400);
  });

  it('returns 401 without an api key', async () => {
    await request(app.getHttpServer())
      .post('/redemptions')
      .set('Idempotency-Key', 'r1')
      .send({ memberEmail, voucherId: 1 })
      .expect(401);
  });

  it('returns the original redemption when the key is repeated', async () => {
    const voucherId = await insertVoucher();
    await addPoints(memberId, 500);

    const res1 = await post('r1', { memberEmail, voucherId }).expect(201);
    const res2 = await post('r1', { memberEmail, voucherId }).expect(200);

    expect(res2.body.id).toBe(res1.body.id);
    expect(res2.body.code).toBe(res1.body.code);
    await expect(redemptionSpends()).resolves.toHaveLength(1);
    await expect(balanceOf(memberId)).resolves.toBe(0);
    await expect(stockOf(voucherId)).resolves.toBe(9);
  });

  it('returns 422 when the key is reused for another voucher', async () => {
    const voucherA = await insertVoucher();
    const voucherB = await insertVoucher();
    await addPoints(memberId, 1000);

    await post('r1', { memberEmail, voucherId: voucherA }).expect(201);
    await post('r1', { memberEmail, voucherId: voucherB }).expect(422);

    await expect(redemptionCount()).resolves.toBe(1);
    await expect(redemptionSpends()).resolves.toHaveLength(1);
    await expect(stockOf(voucherB)).resolves.toBe(10);
  });

  it('lets only one of 10 parallel redemptions spend the last points', async () => {
    const voucherId = await insertVoucher({ stock: 10 });
    await addPoints(memberId, 500);

    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        post(`r${i}`, { memberEmail, voucherId }),
      ),
    );

    expect(countStatuses(responses)).toEqual({ 201: 1, 409: 9 });
    await expect(balanceOf(memberId)).resolves.toBe(0);
    await expect(stockOf(voucherId)).resolves.toBe(9);
    await expect(redemptionCount()).resolves.toBe(1);
  });

  it('never sells more than the stock to parallel members', async () => {
    const voucherId = await insertVoucher({ stock: 1 });
    await addPoints(memberId, 500);
    await addPoints(otherMemberId, 500);

    const responses = await Promise.all([
      post('r1', { memberEmail, voucherId }),
      post('r1', { memberEmail: otherMemberEmail, voucherId }),
    ]);

    expect(countStatuses(responses)).toEqual({ 201: 1, 409: 1 });
    await expect(stockOf(voucherId)).resolves.toBe(0);
    await expect(redemptionCount()).resolves.toBe(1);
    const balances = [
      await balanceOf(memberId),
      await balanceOf(otherMemberId),
    ];
    expect(balances.sort((a, b) => a - b)).toEqual([0, 500]);
  });

  it('redeems once when the same key arrives in parallel', async () => {
    const voucherId = await insertVoucher();
    await addPoints(memberId, 1000);

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => post('r1', { memberEmail, voucherId })),
    );

    expect(countStatuses(responses)).toEqual({ 201: 1, 200: 9 });
    expect(new Set(responses.map((res) => res.body.id)).size).toBe(1);
    await expect(redemptionSpends()).resolves.toHaveLength(1);
    await expect(balanceOf(memberId)).resolves.toBe(500);
    await expect(stockOf(voucherId)).resolves.toBe(9);
  });
});
