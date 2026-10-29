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
  const validUntil = new Date(Date.now() + 30 * 86_400_000).toISOString();

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
      { validUntil: new Date(Date.now() - 1000).toISOString() },
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
});
