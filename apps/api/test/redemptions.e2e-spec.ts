import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { resetDatabase, insertMerchant } from './helpers/database';

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
    await resetDatabase(dataSource);
    callerMerchantId = await insertMerchant(dataSource, apiKey);
    voucherMerchantId = await insertMerchant(dataSource, 'other-key', 'Shop B');
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

  describe('confirm', () => {
    const voucherMerchantKey = 'other-key';

    const issueCode = async (): Promise<string> => {
      const voucherId = await insertVoucher();
      await addPoints(memberId, 500);
      const res = await post('r1', { memberEmail, voucherId }).expect(201);
      return res.body.code;
    };

    const confirm = (code: string, key: string | null = voucherMerchantKey) => {
      const req = request(app.getHttpServer()).post(
        `/redemptions/${code}/confirm`,
      );
      if (key) req.set('x-api-key', key);
      return req.send();
    };

    const statusOf = async (code: string) => {
      const rows = await dataSource.query(
        'SELECT status FROM redemptions WHERE code = ?',
        [code],
      );
      return rows[0].status;
    };

    it('marks the code used', async () => {
      const code = await issueCode();

      const res = await confirm(code).expect(200);

      expect(res.body).toMatchObject({ code, status: 'used' });
      expect(res.body.usedAt).toEqual(expect.any(String));
      await expect(statusOf(code)).resolves.toBe('used');
    });

    it('accepts a lowercase code', async () => {
      const code = await issueCode();

      await confirm(code.toLowerCase()).expect(200);

      await expect(statusOf(code)).resolves.toBe('used');
    });

    it('returns the same result when confirmed again', async () => {
      const code = await issueCode();

      const res1 = await confirm(code).expect(200);
      const res2 = await confirm(code).expect(200);

      expect(res2.body.id).toBe(res1.body.id);
      expect(res2.body.usedAt).toBe(res1.body.usedAt);
    });

    it("returns 404 for another merchant's key and keeps the code issued", async () => {
      const code = await issueCode();

      await confirm(code, apiKey).expect(404);

      await expect(statusOf(code)).resolves.toBe('issued');
    });

    it('returns 404 for an unknown code', async () => {
      await confirm('0000000000').expect(404);
    });

    it('returns 401 without an api key', async () => {
      const code = await issueCode();

      await confirm(code, null).expect(401);
    });

    it('confirms once when 10 requests arrive in parallel', async () => {
      const code = await issueCode();

      const responses = await Promise.all(
        Array.from({ length: 10 }, () => confirm(code)),
      );

      expect(countStatuses(responses)).toEqual({ 200: 10 });
      expect(new Set(responses.map((res) => res.body.usedAt)).size).toBe(1);
    });
  });
});
