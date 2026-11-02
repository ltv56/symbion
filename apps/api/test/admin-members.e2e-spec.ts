import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { adminToken } from './helpers/admin-token';
import { insertMerchant, resetDatabase } from './helpers/database';
import { memberToken } from './helpers/member-token';

describe('Admin members', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let shopA: number;
  let shopB: number;
  let bronze: number;
  let silver: number;
  const DAY = 86_400_000;
  let seq = 0;

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
    const tiers = await dataSource.query(
      `INSERT INTO tiers (name, min_spend, earn_rate) VALUES ('Bronze', 0, 1.00), ('Silver', 1000000, 1.25)`,
    );
    bronze = Number(tiers.insertId);
    silver = bronze + 1;
  });

  afterAll(async () => {
    await app.close();
  });

  const insertMember = async (
    email: string,
    name: string | null,
    merchantId = shopA,
    tierId = bronze,
  ): Promise<number> => {
    const result = await dataSource.query(
      `INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, ?, ?)`,
      [merchantId, tierId, email, name],
    );
    return Number(result.insertId);
  };

  const insertLot = (
    memberId: number,
    points: number,
    {
      remaining = points,
      type = points >= 0 ? 'earn' : 'spend',
      expiresAt = null as Date | null,
      merchantId = shopA,
    } = {},
  ) =>
    dataSource.query(
      `INSERT INTO ledger_lots (merchant_id, member_id, points, remaining, idempotency_key, type, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        merchantId,
        memberId,
        points,
        remaining,
        `seed-${++seq}`,
        type,
        expiresAt,
      ],
    );

  const authed = (req: request.Test) =>
    req.set('Authorization', `Bearer ${token}`);
  const list = (query = '') =>
    authed(request(app.getHttpServer()).get(`/admin/members${query}`));
  const detail = (id: number | string) =>
    authed(request(app.getHttpServer()).get(`/admin/members/${id}`));
  const ids = (body: { items: { id: number }[] }) =>
    body.items.map((m) => m.id);

  describe('GET /admin/members', () => {
    it('lists members newest first with merchant, tier and balance', async () => {
      const john = await insertMember('john@example.com', 'John Nguyen');
      const jane = await insertMember(
        'jane@example.com',
        'Jane Tran',
        shopB,
        silver,
      );
      await insertLot(john, 1000, { expiresAt: new Date(Date.now() + DAY) });
      await insertLot(jane, 400);

      const res = await list().expect(200);

      expect(res.body.nextCursor).toBeNull();
      expect(res.body.items).toEqual([
        {
          id: jane,
          merchantId: shopB,
          merchantName: 'Shop B',
          email: 'jane@example.com',
          name: 'Jane Tran',
          tier: { id: silver, name: 'Silver' },
          balance: 400,
          createdAt: expect.any(String),
        },
        {
          id: john,
          merchantId: shopA,
          merchantName: 'Shop A',
          email: 'john@example.com',
          name: 'John Nguyen',
          tier: { id: bronze, name: 'Bronze' },
          balance: 1000,
          createdAt: expect.any(String),
        },
      ]);
    });

    it('counts only unexpired lots and lets a debt make the balance negative', async () => {
      const john = await insertMember('john@example.com', 'John');
      const jane = await insertMember('jane@example.com', 'Jane');
      await insertLot(john, 500, { expiresAt: new Date(Date.now() - DAY) });
      await insertLot(john, 200, { expiresAt: new Date(Date.now() + DAY) });
      await insertLot(jane, -300, { type: 'spend' });

      const res = await list().expect(200);

      const balance = (id: number) =>
        res.body.items.find((m: { id: number }) => m.id === id).balance;
      expect(balance(john)).toBe(200);
      expect(balance(jane)).toBe(-300);
    });

    it('shows the same balance as the member sees', async () => {
      const john = await insertMember('john@example.com', 'John');
      await insertLot(john, 900, { expiresAt: new Date(Date.now() + DAY) });
      await insertLot(john, 100, { expiresAt: new Date(Date.now() - DAY) });
      await insertLot(john, -250, { type: 'spend' });
      const own = await memberToken(app, 'john@example.com');

      const me = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${own}`)
        .expect(200);
      const res = await list().expect(200);

      expect(res.body.items[0].balance).toBe(me.body.balance);
      expect(me.body.balance).toBe(650);
    });

    it('filters by merchant and by tier', async () => {
      const john = await insertMember('john@example.com', 'John');
      const jane = await insertMember(
        'jane@example.com',
        'Jane',
        shopB,
        silver,
      );
      const jim = await insertMember('jim@example.com', 'Jim', shopB, bronze);

      expect(
        ids((await list(`?merchantId=${shopB}`).expect(200)).body),
      ).toEqual([jim, jane]);
      expect(ids((await list(`?tierId=${bronze}`).expect(200)).body)).toEqual([
        jim,
        john,
      ]);
      expect(
        ids(
          (await list(`?merchantId=${shopB}&tierId=${silver}`).expect(200))
            .body,
        ),
      ).toEqual([jane]);
    });

    it('searches the name and the email, ignoring case', async () => {
      const john = await insertMember('john@example.com', 'John Nguyen');
      const jane = await insertMember('jane.tran@example.com', 'Jane Tran');
      const jim = await insertMember('jim@example.com', null);

      expect(ids((await list('?q=NGUYEN').expect(200)).body)).toEqual([john]);
      expect(ids((await list('?q=tran@').expect(200)).body)).toEqual([jane]);
      expect(ids((await list('?q=@EXAMPLE').expect(200)).body)).toEqual([
        jim,
        jane,
        john,
      ]);
    });

    it('takes % and _ in a search literally', async () => {
      await insertMember('john@example.com', 'John');
      const odd = await insertMember('a_b@example.com', '100% Fan');

      expect(ids((await list('?q=%25').expect(200)).body)).toEqual([odd]);
      expect(ids((await list('?q=a_b').expect(200)).body)).toEqual([odd]);
      expect(ids((await list('?q=_').expect(200)).body)).toEqual([odd]);
    });

    it('treats an empty search as none', async () => {
      const john = await insertMember('john@example.com', 'John');

      expect(ids((await list('?q=').expect(200)).body)).toEqual([john]);
    });

    it('pages by keyset', async () => {
      const all: number[] = [];
      for (let i = 0; i < 5; i++) {
        all.push(await insertMember(`m${i}@example.com`, `M${i}`));
      }
      all.reverse();

      const first = await list('?limit=2').expect(200);
      expect(ids(first.body)).toEqual(all.slice(0, 2));
      expect(first.body.nextCursor).toBe(all[1]);
      const second = await list(
        `?limit=2&after=${first.body.nextCursor}`,
      ).expect(200);
      expect(ids(second.body)).toEqual(all.slice(2, 4));
      const last = await list(
        `?limit=2&after=${second.body.nextCursor}`,
      ).expect(200);
      expect(ids(last.body)).toEqual([all[4]]);
      expect(last.body.nextCursor).toBeNull();
    });

    it.each([
      ['limit 0', '?limit=0'],
      ['limit 101', '?limit=101'],
      ['after 0', '?after=0'],
      ['a fractional merchantId', '?merchantId=1.5'],
      ['a text tierId', '?tierId=gold'],
      ['a search over 100 characters', `?q=${'a'.repeat(101)}`],
    ])('returns 400 for %s', async (_label, query) => {
      await list(query).expect(400);
    });

    it('returns 401 without an admin token', async () => {
      await insertMember('john@example.com', 'John');
      await request(app.getHttpServer()).get('/admin/members').expect(401);
      const own = await memberToken(app, 'john@example.com');
      await request(app.getHttpServer())
        .get('/admin/members')
        .set('Authorization', `Bearer ${own}`)
        .expect(401);
    });
  });

  describe('GET /admin/members/:id', () => {
    it('returns the member with profile, lots, history and redemptions', async () => {
      const john = await insertMember('john@example.com', 'John Nguyen');
      await insertLot(john, 1000, {
        expiresAt: new Date(Date.now() + 30 * DAY),
      });
      await insertLot(john, 500, { expiresAt: new Date(Date.now() - DAY) });
      await dataSource.query(
        `INSERT INTO orders (merchant_id, member_id, idempotency_key, amount, created_at)
         VALUES (?, ?, 'order-1', 2000000, NOW() - INTERVAL 2 MONTH)`,
        [shopA, john],
      );
      const voucher = await dataSource.query(
        `INSERT INTO vouchers (merchant_id, title, face_value, points_price, stock, valid_until)
         VALUES (?, 'Giảm 50.000đ', 50000, 500, 10, ?)`,
        [shopB, new Date(Date.now() + 30 * DAY)],
      );
      await dataSource.query(
        `INSERT INTO redemptions (merchant_id, member_id, voucher_id, code, points, point_value_vnd, status, client_key, expires_at)
         VALUES (?, ?, ?, 'ABCDEFGHJK', 500, 100, 'issued', 'k1', ?)`,
        [
          shopA,
          john,
          Number(voucher.insertId),
          new Date(Date.now() + 30 * DAY),
        ],
      );

      const res = await detail(john).expect(200);

      expect(res.body).toMatchObject({
        id: john,
        merchantId: shopA,
        merchantName: 'Shop A',
        email: 'john@example.com',
        name: 'John Nguyen',
        tier: { id: bronze, name: 'Bronze' },
        balance: 1000,
        spend12m: 2_000_000,
        nextTier: { id: silver, name: 'Silver', minSpend: 1_000_000 },
      });
      expect(res.body.lots).toEqual([
        expect.objectContaining({ merchantName: 'Shop A', remaining: 1000 }),
      ]);
      expect(res.body.history.map((h: { points: number }) => h.points)).toEqual(
        [500, 1000],
      );
      expect(res.body.redemptions).toEqual([
        expect.objectContaining({
          code: 'ABCDEFGHJK',
          voucherTitle: 'Giảm 50.000đ',
          status: 'issued',
        }),
      ]);
    });

    it('returns empty lists for a member with no activity', async () => {
      const john = await insertMember('john@example.com', null);

      const res = await detail(john).expect(200);

      expect(res.body).toMatchObject({
        name: null,
        balance: 0,
        spend12m: 0,
        lots: [],
        history: [],
        redemptions: [],
      });
    });

    it('returns 404 for an unknown id', async () => {
      await detail(999_999).expect(404);
    });

    it('returns 400 when the id is not an integer', async () => {
      await detail('abc').expect(400);
    });

    it('returns 401 without an admin token', async () => {
      const john = await insertMember('john@example.com', 'John');
      await request(app.getHttpServer())
        .get(`/admin/members/${john}`)
        .expect(401);
    });
  });
});
