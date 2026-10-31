import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { adminToken } from './helpers/admin-token';
import { insertMerchant, resetDatabase } from './helpers/database';
import { memberToken } from './helpers/member-token';

describe('Me', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let merchantId: number;
  let otherMerchantId: number;
  let memberId: number;
  let otherMemberId: number;
  let token: string;
  const email = 'john@example.com';

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
    merchantId = await insertMerchant(dataSource, 'key-a', 'Shop A');
    otherMerchantId = await insertMerchant(dataSource, 'key-b', 'Shop B');
    const tier = await dataSource.query(
      `INSERT INTO tiers (name, min_spend, earn_rate) VALUES ('Silver', 0, 1.25)`,
    );
    const insertMember = async (memberEmail: string) => {
      const res = await dataSource.query(
        `INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, ?, 'John')`,
        [merchantId, Number(tier.insertId), memberEmail],
      );
      return Number(res.insertId);
    };
    memberId = await insertMember(email);
    otherMemberId = await insertMember('jane@example.com');
    token = await memberToken(app, email);
  });

  afterAll(async () => {
    await app.close();
  });

  let lotSeq = 0;
  const addLot = (
    forMemberId: number,
    points: number,
    {
      atMerchant = merchantId,
      expiresAt = null as Date | null,
      ref = null as { type: string; id: number } | null,
    } = {},
  ) =>
    dataSource.query(
      `INSERT INTO ledger_lots (merchant_id, member_id, points, remaining, expires_at, idempotency_key, type, ref_type, ref_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        atMerchant,
        forMemberId,
        points,
        points,
        expiresAt,
        `seed-${++lotSeq}`,
        points > 0 ? 'earn' : 'spend',
        ref?.type ?? null,
        ref?.id ?? null,
      ],
    );

  const get = (path: string, auth: string | null = `Bearer ${token}`) => {
    const req = request(app.getHttpServer()).get(path);
    if (auth) req.set('Authorization', auth);
    return req;
  };

  describe('GET /me', () => {
    it('returns the member with tier and balance', async () => {
      await addLot(memberId, 300);
      await addLot(memberId, 200, { atMerchant: otherMerchantId });
      await addLot(memberId, 1000, {
        expiresAt: new Date(Date.now() - 60_000),
      });
      await addLot(otherMemberId, 999);

      const res = await get('/me').expect(200);

      expect(res.body).toEqual({
        id: memberId,
        email,
        name: 'John',
        tier: { id: expect.any(Number), name: 'Silver' },
        balance: 500,
        spend12m: 0,
        nextTier: null,
      });
    });

    describe('tier progress', () => {
      let orderSeq = 0;
      const addOrder = async (amount: number, monthsAgo = 0) => {
        const res = await dataSource.query(
          `INSERT INTO orders (merchant_id, member_id, idempotency_key, amount, created_at)
          VALUES (?, ?, ?, ?, NOW() - INTERVAL ? MONTH)`,
          [merchantId, memberId, `order-${++orderSeq}`, amount, monthsAgo],
        );
        return Number(res.insertId);
      };
      const addRefund = (orderId: number, amount: number) =>
        dataSource.query(
          `INSERT INTO refunds (merchant_id, order_id, idempotency_key, amount)
          VALUES (?, ?, ?, ?)`,
          [merchantId, orderId, `refund-${++orderSeq}`, amount],
        );

      it('returns the 12-month spend and the next tier above the current one', async () => {
        const gold = await dataSource.query(
          `INSERT INTO tiers (name, min_spend, earn_rate) VALUES ('Gold', 5000000, 1.5)`,
        );
        await dataSource.query(
          `INSERT INTO tiers (name, min_spend, earn_rate) VALUES ('Platinum', 10000000, 2)`,
        );
        await addOrder(800_000);
        const refunded = await addOrder(300_000);
        await addRefund(refunded, 100_000);
        const old = await addOrder(2_000_000, 13);
        await addRefund(old, 500_000);

        const res = await get('/me').expect(200);

        expect(res.body.spend12m).toBe(1_000_000);
        expect(res.body.nextTier).toEqual({
          id: Number(gold.insertId),
          name: 'Gold',
          minSpend: 5_000_000,
        });
      });

      it('returns no next tier on the top tier', async () => {
        await addOrder(800_000);

        const res = await get('/me').expect(200);

        expect(res.body.spend12m).toBe(800_000);
        expect(res.body.nextTier).toBeNull();
      });
    });

    it('shows a negative balance', async () => {
      await addLot(memberId, -40);

      const res = await get('/me').expect(200);

      expect(res.body.balance).toBe(-40);
    });
  });

  describe('GET /me/history', () => {
    it("returns the member's own entries, newest first", async () => {
      await addLot(memberId, 300, { ref: { type: 'order', id: 7 } });
      await addLot(memberId, -100, { atMerchant: otherMerchantId });
      await addLot(otherMemberId, 999);

      const res = await get('/me/history').expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({
        type: 'spend',
        points: -100,
        merchantName: 'Shop B',
        ref: null,
      });
      expect(res.body[1]).toMatchObject({
        type: 'earn',
        points: 300,
        merchantName: 'Shop A',
        ref: { type: 'order', id: 7 },
        expiresAt: null,
      });
      expect(res.body[1].createdAt).toEqual(expect.any(String));
    });

    it('returns at most 50 entries', async () => {
      for (let i = 1; i <= 55; i++) {
        await addLot(memberId, i);
      }

      const res = await get('/me/history').expect(200);

      expect(res.body).toHaveLength(50);
      expect(res.body[0].points).toBe(55);
      expect(res.body[49].points).toBe(6);
    });
  });

  describe('GET /me/lots', () => {
    const day = 86_400_000;
    const inDays = (days: number) => new Date(Date.now() + days * day);

    it('returns unspent, unexpired lots by expiry, lots without expiry last', async () => {
      await addLot(memberId, 100, { expiresAt: inDays(200) });
      await addLot(memberId, 300, {
        atMerchant: otherMerchantId,
        expiresAt: inDays(30),
      });
      await addLot(memberId, 50);
      await addLot(memberId, 70, { expiresAt: inDays(200) });

      const res = await get('/me/lots').expect(200);

      expect(res.body).toEqual([
        {
          id: expect.any(Number),
          merchantId: otherMerchantId,
          merchantName: 'Shop B',
          remaining: 300,
          expiresAt: expect.any(String),
        },
        expect.objectContaining({ remaining: 100, merchantName: 'Shop A' }),
        expect.objectContaining({ remaining: 70 }),
        expect.objectContaining({ remaining: 50, expiresAt: null }),
      ]);
    });

    it('leaves out spent-out, expired, debt and other members lots', async () => {
      await addLot(memberId, 100, { expiresAt: inDays(10) });
      await addLot(memberId, 500, { expiresAt: new Date(Date.now() - 60_000) });
      await addLot(memberId, -40);
      await addLot(otherMemberId, 999, { expiresAt: inDays(10) });
      await dataSource.query(
        `UPDATE ledger_lots SET remaining = 0 WHERE member_id = ? AND points = 100`,
        [memberId],
      );
      await addLot(memberId, 60, { expiresAt: inDays(20) });

      const res = await get('/me/lots').expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].remaining).toBe(60);
    });

    it('returns an empty list for a member with no points', async () => {
      const res = await get('/me/lots').expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('POST /me/redemptions', () => {
    const insertVoucher = async (): Promise<number> => {
      const res = await dataSource.query(
        `INSERT INTO vouchers (merchant_id, title, face_value, points_price, stock, valid_until)
        VALUES (?, 'Coffee', 50000, 500, 10, ?)`,
        [otherMerchantId, new Date(Date.now() + 86_400_000)],
      );
      return Number(res.insertId);
    };

    const redeem = (
      body: object,
      key: string | null = 'r1',
      auth: string | null = `Bearer ${token}`,
    ) => {
      const req = request(app.getHttpServer()).post('/me/redemptions');
      if (auth) req.set('Authorization', auth);
      if (key) req.set('Idempotency-Key', key);
      return req.send(body);
    };

    const balance = async () => (await get('/me').expect(200)).body.balance;

    it('redeems a voucher for the logged-in member', async () => {
      const voucherId = await insertVoucher();
      await addLot(memberId, 800);

      const res = await redeem({ voucherId }).expect(201);

      expect(res.body).toMatchObject({
        memberId,
        voucherId,
        merchantId: otherMerchantId,
        points: 500,
        status: 'issued',
      });
      await expect(balance()).resolves.toBe(300);
    });

    it('returns the same redemption when the key is repeated', async () => {
      const voucherId = await insertVoucher();
      await addLot(memberId, 800);

      const res1 = await redeem({ voucherId }).expect(201);
      const res2 = await redeem({ voucherId }).expect(200);

      expect(res2.body.id).toBe(res1.body.id);
      await expect(balance()).resolves.toBe(300);
    });

    it('returns 409 when the balance is too low', async () => {
      const voucherId = await insertVoucher();
      await addLot(memberId, 499);

      await redeem({ voucherId }).expect(409);
    });

    it.each([
      ['no Idempotency-Key', { voucherId: 1 }, null],
      [
        'a memberEmail field',
        { voucherId: 1, memberEmail: 'jane@example.com' },
        'r1',
      ],
      ['no voucherId', {}, 'r1'],
    ])('returns 400 for %s', async (_label, body, key) => {
      await redeem(body, key).expect(400);
    });

    it('returns 401 without a member token', async () => {
      const voucherId = await insertVoucher();
      await addLot(memberId, 800);

      await redeem({ voucherId }, 'r1', null).expect(401);
      await redeem(
        { voucherId },
        'r1',
        `Bearer ${await adminToken(app)}`,
      ).expect(401);
      await expect(balance()).resolves.toBe(800);
    });
  });

  describe.each(['/me', '/me/history', '/me/lots'])('%s auth', (path) => {
    it('returns 401 without a token', async () => {
      await get(path, null).expect(401);
    });

    it('returns 401 for an admin token', async () => {
      await get(path, `Bearer ${await adminToken(app)}`).expect(401);
    });

    it('returns 401 for a malformed token', async () => {
      await get(path, 'Bearer not-a-jwt').expect(401);
    });

    it('returns 401 for a merchant api key', async () => {
      await request(app.getHttpServer())
        .get(path)
        .set('x-api-key', 'key-a')
        .expect(401);
    });
  });
});
