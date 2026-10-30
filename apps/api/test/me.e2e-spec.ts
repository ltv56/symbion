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
      `INSERT INTO tiers (name, min_points, earn_rate) VALUES ('Silver', 0, 1.25)`,
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

  describe.each(['/me', '/me/history'])('%s auth', (path) => {
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
