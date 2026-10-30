import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { adminToken } from './helpers/admin-token';

describe('Vouchers', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let merchantId: number;
  // whole seconds: TIMESTAMP has no fraction
  const validUntil = new Date(
    Math.floor(Date.now() / 1000) * 1000 + 30 * 86_400_000,
  ).toISOString();

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
    await dataSource.query('DELETE FROM redemptions');
    await dataSource.query('DELETE FROM vouchers');
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM ledger_lots');
    await dataSource.query('DELETE FROM members');
    await dataSource.query('DELETE FROM merchants');
    const merchant = await dataSource.query(
      `INSERT INTO merchants (name, api_key_hash) VALUES ('Shop A', ?)`,
      [createHash('sha256').update('test-api-key').digest('hex')],
    );
    merchantId = Number(merchant.insertId);
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM vouchers');
    await app.close();
  });

  const body = (overrides: Record<string, unknown> = {}) => ({
    merchantId,
    title: 'Giảm 50.000đ',
    faceValue: 50000,
    pointsPrice: 500,
    stock: 100,
    validUntil,
    ...overrides,
  });

  const create = (payload: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/vouchers')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

  it('creates a voucher at the floor', async () => {
    const res = await create(body({ title: '  Giảm 50.000đ ' })).expect(201);

    expect(res.body).toEqual({
      id: expect.any(Number),
      merchantId,
      title: 'Giảm 50.000đ',
      faceValue: 50000,
      pointsPrice: 500,
      stock: 100,
      validUntil,
      status: 'active',
      createdAt: expect.any(String),
    });
    const rows = await dataSource.query(
      'SELECT face_value, points_price, status FROM vouchers WHERE id = ?',
      [res.body.id],
    );
    expect(rows).toEqual([
      { face_value: 50000, points_price: 500, status: 'active' },
    ]);
  });

  it('accepts a face value above the floor', async () => {
    await create(body({ faceValue: 70000 })).expect(201);
  });

  it('returns 400 when the face value is below the floor', async () => {
    const res = await create(body({ faceValue: 49999 })).expect(400);

    expect(res.body.message).toBe(
      'faceValue 49999 is below the floor 50000 (500 points x 100 VND)',
    );
    const rows = await dataSource.query('SELECT id FROM vouchers');
    expect(rows).toHaveLength(0);
  });

  it('uses the point value from program_settings', async () => {
    await dataSource.query('UPDATE program_settings SET point_value_vnd = 200');
    try {
      await create(body({ faceValue: 50000 })).expect(400);
      await create(body({ faceValue: 100000 })).expect(201);
    } finally {
      await dataSource.query(
        'UPDATE program_settings SET point_value_vnd = 100',
      );
    }
  });

  it('returns 404 for an unknown merchant', async () => {
    const res = await create(body({ merchantId: merchantId + 1000 })).expect(
      404,
    );
    expect(res.body.message).toBe(
      `Merchant with id ${merchantId + 1000} not found`,
    );
  });

  it.each([
    ['a missing merchantId', { merchantId: undefined }],
    ['a blank title', { title: '   ' }],
    ['a title over 255 characters', { title: 'a'.repeat(256) }],
    ['a zero faceValue', { faceValue: 0 }],
    ['a fractional faceValue', { faceValue: 1.5 }],
    ['a string faceValue', { faceValue: '50000' }],
    ['a zero pointsPrice', { pointsPrice: 0 }],
    ['a negative stock', { stock: -1 }],
    ['a stock over 4294967295', { stock: 4294967296 }],
    ['a missing validUntil', { validUntil: undefined }],
    ['a validUntil that is not a date', { validUntil: 'soon' }],
    [
      'a validUntil in the past',
      {
        validUntil: new Date(
          Math.floor((Date.now() - 1000) / 1000) * 1000,
        ).toISOString(),
      },
    ],
    [
      'a validUntil with fractional seconds',
      { validUntil: new Date(Date.parse(validUntil) + 500).toISOString() },
    ],
    ['a status field', { status: 'expired' }],
  ])('returns 400 for %s', async (_label, overrides) => {
    await create(body(overrides)).expect(400);
  });

  it('accepts a zero stock', async () => {
    await create(body({ stock: 0 })).expect(201);
  });

  it.each([
    ['no token', undefined],
    ['a malformed token', 'Bearer nope'],
  ])('returns 401 for %s', async (_label, header) => {
    const req = request(app.getHttpServer()).post('/vouchers');
    if (header) req.set('Authorization', header);
    await req.send(body()).expect(401);
  });

  const insertVoucher = async (
    title: string,
    { status = 'active', validUntil: until = new Date(validUntil) } = {},
  ): Promise<number> => {
    const res = await dataSource.query(
      `INSERT INTO vouchers (merchant_id, title, face_value, points_price, stock, valid_until, status)
       VALUES (?, ?, 50000, 500, 10, ?, ?)`,
      [merchantId, title, until, status],
    );
    return Number(res.insertId);
  };

  describe('GET /vouchers', () => {
    const list = (query = '') =>
      request(app.getHttpServer()).get(`/vouchers${query}`);
    const ids = (resBody: { items: { id: number }[] }) =>
      resBody.items.map((v) => v.id);

    it('returns an empty page when there are no vouchers', async () => {
      const res = await list().expect(200);
      expect(res.body).toEqual({ items: [], nextCursor: null });
    });

    it('lists active vouchers newest id first and hides expired ones', async () => {
      const a = await insertVoucher('A');
      await insertVoucher('expired status', { status: 'expired' });
      await insertVoucher('past valid_until', {
        validUntil: new Date(Date.now() - 1000),
      });
      const d = await insertVoucher('D');

      const res = await list().expect(200);

      expect(ids(res.body)).toEqual([d, a]);
      expect(res.body.nextCursor).toBeNull();
      expect(res.body.items[0]).toEqual({
        id: d,
        merchantId,
        title: 'D',
        faceValue: 50000,
        pointsPrice: 500,
        stock: 10,
        validUntil,
        status: 'active',
        createdAt: expect.any(String),
      });
    });

    it('pages with limit and after until nextCursor is null', async () => {
      const created: number[] = [];
      for (const title of ['1', '2', '3', '4', '5']) {
        created.push(await insertVoucher(title));
      }
      const newestFirst = [...created].reverse();

      const page1 = await list('?limit=2').expect(200);
      expect(ids(page1.body)).toEqual(newestFirst.slice(0, 2));
      expect(page1.body.nextCursor).toBe(newestFirst[1]);

      const page2 = await list(
        `?limit=2&after=${page1.body.nextCursor}`,
      ).expect(200);
      expect(ids(page2.body)).toEqual(newestFirst.slice(2, 4));
      expect(page2.body.nextCursor).toBe(newestFirst[3]);

      const page3 = await list(
        `?limit=2&after=${page2.body.nextCursor}`,
      ).expect(200);
      expect(ids(page3.body)).toEqual([newestFirst[4]]);
      expect(page3.body.nextCursor).toBeNull();
    });

    it('returns a null cursor when the last page is exactly full', async () => {
      await insertVoucher('1');
      await insertVoucher('2');
      const res = await list('?limit=2').expect(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.nextCursor).toBeNull();
    });

    it('defaults to 20 items per page', async () => {
      for (let i = 0; i < 21; i++) await insertVoucher(`v${i}`);
      const res = await list().expect(200);
      expect(res.body.items).toHaveLength(20);
      expect(res.body.nextCursor).toBe(res.body.items[19].id);
    });

    it.each([
      ['limit 0', '?limit=0'],
      ['limit 101', '?limit=101'],
      ['a non-numeric limit', '?limit=abc'],
      ['a fractional limit', '?limit=1.5'],
      ['after 0', '?after=0'],
      ['a non-numeric after', '?after=abc'],
      ['an unknown query field', '?page=2'],
    ])('returns 400 for %s', async (_label, query) => {
      await list(query).expect(400);
    });
  });

  describe('GET /vouchers/:id', () => {
    const get = (id: number | string) =>
      request(app.getHttpServer()).get(`/vouchers/${id}`);

    it('gets an active voucher', async () => {
      const id = await insertVoucher('A');
      const res = await get(id).expect(200);
      expect(res.body).toMatchObject({ id, merchantId, title: 'A' });
    });

    it.each([
      ['an expired status', { status: 'expired' }],
      ['a past valid_until', { validUntil: new Date(Date.now() - 1000) }],
    ])('returns 404 for %s', async (_label, options) => {
      const id = await insertVoucher('hidden', options);
      const res = await get(id).expect(404);
      expect(res.body.message).toBe(`Voucher with id ${id} not found`);
    });

    it('returns 404 for an unknown id', async () => {
      await get(999999).expect(404);
    });

    it('returns 400 when the id is not an integer', async () => {
      await get('abc').expect(400);
    });
  });
});
