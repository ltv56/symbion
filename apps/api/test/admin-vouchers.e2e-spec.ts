import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { adminToken } from './helpers/admin-token';
import { insertMerchant, resetDatabase } from './helpers/database';
import { memberToken } from './helpers/member-token';

describe('Admin vouchers', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let shopA: number;
  let shopB: number;
  let memberId: number;
  const DAY = 86_400_000;
  // whole seconds: TIMESTAMP has no fraction
  const inDays = (days: number) =>
    new Date(Math.floor(Date.now() / 1000) * 1000 + days * DAY);

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

  const insertVoucher = async (
    overrides: {
      merchantId?: number;
      title?: string;
      stock?: number;
      validUntil?: Date;
      status?: string;
    } = {},
  ): Promise<number> => {
    const result = await dataSource.query(
      `INSERT INTO vouchers (merchant_id, title, face_value, points_price, stock, valid_until, status)
       VALUES (?, ?, 50000, 500, ?, ?, ?)`,
      [
        overrides.merchantId ?? shopA,
        overrides.title ?? 'Giảm 50.000đ',
        overrides.stock ?? 10,
        overrides.validUntil ?? inDays(30),
        overrides.status ?? 'active',
      ],
    );
    return Number(result.insertId);
  };

  const authed = (req: request.Test) =>
    req.set('Authorization', `Bearer ${token}`);
  const list = (query = '') =>
    authed(request(app.getHttpServer()).get(`/admin/vouchers${query}`));
  const patch = (id: number | string, body: Record<string, unknown>) =>
    authed(request(app.getHttpServer()).patch(`/vouchers/${id}`)).send(body);

  const stored = async (id: number) => {
    const [row] = await dataSource.query(
      `SELECT stock, valid_until, status FROM vouchers WHERE id = ?`,
      [id],
    );
    return {
      stock: Number(row.stock),
      validUntil: new Date(row.valid_until).getTime(),
      status: row.status,
    };
  };

  describe('GET /admin/vouchers', () => {
    it('lists vouchers in every state, newest first, with the merchant and the codes issued', async () => {
      const live = await insertVoucher({ title: 'Live' });
      const retired = await insertVoucher({
        title: 'Retired',
        status: 'expired',
      });
      const lapsed = await insertVoucher({
        title: 'Lapsed',
        validUntil: new Date(Date.now() - DAY),
      });
      const soldOut = await insertVoucher({
        title: 'Sold out',
        stock: 0,
        merchantId: shopB,
      });
      await dataSource.query(
        `INSERT INTO redemptions (merchant_id, member_id, voucher_id, code, points, point_value_vnd, status, client_key, expires_at)
         VALUES (?, ?, ?, 'ABCDEFGHJK', 500, 100, 'issued', 'k1', ?)`,
        [shopA, memberId, live, inDays(30)],
      );

      const res = await list().expect(200);

      expect(res.body.nextCursor).toBeNull();
      expect(res.body.items.map((v: { id: number }) => v.id)).toEqual([
        soldOut,
        lapsed,
        retired,
        live,
      ]);
      expect(res.body.items[0]).toEqual({
        id: soldOut,
        merchantId: shopB,
        merchantName: 'Shop B',
        title: 'Sold out',
        description: null,
        steps: null,
        faceValue: 50000,
        pointsPrice: 500,
        stock: 0,
        validUntil: expect.any(String),
        status: 'active',
        createdAt: expect.any(String),
        redeemedCount: 0,
      });
      const byId = new Map<number, { redeemedCount: number }>(
        res.body.items.map((v: { id: number; redeemedCount: number }) => [
          v.id,
          v,
        ]),
      );
      expect(byId.get(live)?.redeemedCount).toBe(1);
      expect(byId.get(retired)?.redeemedCount).toBe(0);
    });

    it('filters by merchant, by status and by both', async () => {
      const a1 = await insertVoucher({ merchantId: shopA });
      const a2 = await insertVoucher({ merchantId: shopA, status: 'expired' });
      const b1 = await insertVoucher({ merchantId: shopB });
      const ids = (body: { items: { id: number }[] }) =>
        body.items.map((v) => v.id);

      expect(
        ids((await list(`?merchantId=${shopA}`).expect(200)).body),
      ).toEqual([a2, a1]);
      expect(ids((await list('?status=expired').expect(200)).body)).toEqual([
        a2,
      ]);
      expect(ids((await list('?status=active').expect(200)).body)).toEqual([
        b1,
        a1,
      ]);
      expect(
        ids(
          (await list(`?merchantId=${shopB}&status=expired`).expect(200)).body,
        ),
      ).toEqual([]);
    });

    it('pages by keyset', async () => {
      const ids: number[] = [];
      for (let i = 0; i < 5; i++) ids.push(await insertVoucher());
      ids.reverse();

      const first = await list('?limit=2').expect(200);
      expect(first.body.items.map((v: { id: number }) => v.id)).toEqual(
        ids.slice(0, 2),
      );
      expect(first.body.nextCursor).toBe(ids[1]);

      const second = await list(
        `?limit=2&after=${first.body.nextCursor}`,
      ).expect(200);
      expect(second.body.items.map((v: { id: number }) => v.id)).toEqual(
        ids.slice(2, 4),
      );

      const last = await list(
        `?limit=2&after=${second.body.nextCursor}`,
      ).expect(200);
      expect(last.body.items.map((v: { id: number }) => v.id)).toEqual([
        ids[4],
      ]);
      expect(last.body.nextCursor).toBeNull();
    });

    it.each([
      ['limit 0', '?limit=0'],
      ['limit 101', '?limit=101'],
      ['after 0', '?after=0'],
      ['a fractional merchantId', '?merchantId=1.5'],
      ['an unknown status', '?status=paused'],
    ])('returns 400 for %s', async (_label, query) => {
      await list(query).expect(400);
    });

    it('returns 401 without an admin token', async () => {
      await request(app.getHttpServer()).get('/admin/vouchers').expect(401);
      const member = await memberToken(app, 'john@example.com');
      await request(app.getHttpServer())
        .get('/admin/vouchers')
        .set('Authorization', `Bearer ${member}`)
        .expect(401);
    });
  });

  describe('PATCH /vouchers/:id', () => {
    it('changes the stock and the end date', async () => {
      const id = await insertVoucher({ stock: 10 });
      const validUntil = inDays(90);

      const res = await patch(id, {
        stock: 25,
        validUntil: validUntil.toISOString(),
      }).expect(200);

      expect(res.body).toMatchObject({
        id,
        merchantId: shopA,
        faceValue: 50000,
        pointsPrice: 500,
        stock: 25,
        validUntil: validUntil.toISOString(),
        status: 'active',
      });
      expect(await stored(id)).toEqual({
        stock: 25,
        validUntil: validUntil.getTime(),
        status: 'active',
      });
    });

    it('sets the stock to zero and to the column maximum', async () => {
      const id = await insertVoucher({ stock: 10 });

      await patch(id, { stock: 0 }).expect(200);
      expect((await stored(id)).stock).toBe(0);
      await patch(id, { stock: 4_294_967_295 }).expect(200);
      expect((await stored(id)).stock).toBe(4_294_967_295);
    });

    it('keeps the fields that are not sent', async () => {
      const validUntil = inDays(30);
      const id = await insertVoucher({ stock: 10, validUntil });

      await patch(id, { stock: 3 }).expect(200);

      expect(await stored(id)).toEqual({
        stock: 3,
        validUntil: validUntil.getTime(),
        status: 'active',
      });
    });

    it('accepts an empty body and changes nothing', async () => {
      const id = await insertVoucher({ stock: 10 });

      const res = await patch(id, {}).expect(200);

      expect(res.body.stock).toBe(10);
    });

    it('retires a voucher for good: unlisted, repeatable, not reversible', async () => {
      const id = await insertVoucher();

      const res = await patch(id, { status: 'expired' }).expect(200);

      expect(res.body.status).toBe('expired');
      expect((await stored(id)).status).toBe('expired');
      await request(app.getHttpServer()).get(`/vouchers/${id}`).expect(404);
      const listed = await request(app.getHttpServer())
        .get('/vouchers')
        .expect(200);
      expect(listed.body.items).toEqual([]);
      await patch(id, { status: 'expired' }).expect(200);
      await patch(id, { status: 'active' }).expect(400);
      expect((await stored(id)).status).toBe('expired');
    });

    it('stops redemption once the stock is zero or the voucher is retired', async () => {
      const id = await insertVoucher({ stock: 5 });
      await dataSource.query(
        `INSERT INTO ledger_lots (merchant_id, member_id, points, remaining, idempotency_key, type)
         VALUES (?, ?, 5000, 5000, 'seed-1', 'earn')`,
        [shopA, memberId],
      );
      const redeem = (key: string) =>
        request(app.getHttpServer())
          .post('/redemptions')
          .set('x-api-key', 'key-a')
          .set('Idempotency-Key', key)
          .send({ memberEmail: 'john@example.com', voucherId: id });

      await redeem('r1').expect(201);
      await patch(id, { stock: 0 }).expect(200);
      await redeem('r2').expect(409);
      await patch(id, { stock: 2 }).expect(200);
      await redeem('r3').expect(201);
      expect((await stored(id)).stock).toBe(1);
      await patch(id, { status: 'expired' }).expect(200);
      await redeem('r4').expect(404);
    });

    it('returns 404 for an unknown id', async () => {
      await patch(999_999, { stock: 1 }).expect(404);
    });

    it('returns 400 when the id is not an integer', async () => {
      await patch('abc', { stock: 1 }).expect(400);
    });

    it.each([
      ['a null stock', { stock: null }],
      ['a negative stock', { stock: -1 }],
      ['a fractional stock', { stock: 1.5 }],
      ['a string stock', { stock: '5' }],
      ['a stock over 4294967295', { stock: 4_294_967_296 }],
      ['a null validUntil', { validUntil: null }],
      ['a past validUntil', { validUntil: '2020-01-01T00:00:00.000Z' }],
      ['a validUntil that is not a date', { validUntil: 'soon' }],
      [
        'a validUntil with milliseconds',
        { validUntil: inDays(5).getTime() + 1 },
      ],
      ['a null status', { status: null }],
      ['a status of active', { status: 'active' }],
      ['an unknown status', { status: 'paused' }],
      ['a title', { title: 'New title' }],
      ['a price', { pointsPrice: 1 }],
      ['a face value', { faceValue: 1 }],
    ])('returns 400 for %s', async (_label, body) => {
      const id = await insertVoucher({ stock: 10 });
      const before = await stored(id);

      await patch(id, body).expect(400);

      expect(await stored(id)).toEqual(before);
    });

    it.each([
      ['no token', undefined],
      ['a malformed token', 'Bearer nope'],
    ])('returns 401 for %s', async (_label, header) => {
      const id = await insertVoucher({ stock: 10 });
      const req = request(app.getHttpServer()).patch(`/vouchers/${id}`);
      if (header) req.set('Authorization', header);

      await req.send({ stock: 1 }).expect(401);

      expect((await stored(id)).stock).toBe(10);
    });
  });
});
