import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { adminToken } from './helpers/admin-token';
import { insertMerchant, resetDatabase } from './helpers/database';

describe('Program settings', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let merchantId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    token = await adminToken(app);
  });

  const restoreValue = () =>
    dataSource.query(
      `UPDATE program_settings SET point_value_vnd = 100 WHERE id = 1`,
    );

  beforeEach(async () => {
    await resetDatabase(dataSource);
    await restoreValue();
    merchantId = await insertMerchant(dataSource, 'test-api-key');
  });

  afterAll(async () => {
    await restoreValue();
    await app.close();
  });

  const get = () =>
    request(app.getHttpServer())
      .get('/settings')
      .set('Authorization', `Bearer ${token}`);

  const patch = (payload: Record<string, unknown>) =>
    request(app.getHttpServer())
      .patch('/settings')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

  const insertVoucher = async (
    overrides: {
      title?: string;
      faceValue?: number;
      pointsPrice?: number;
      validUntil?: Date;
      status?: string;
    } = {},
  ): Promise<number> => {
    const result = await dataSource.query(
      `INSERT INTO vouchers (merchant_id, title, face_value, points_price, stock, valid_until, status)
       VALUES (?, ?, ?, ?, 10, ?, ?)`,
      [
        merchantId,
        overrides.title ?? 'Giảm 50.000đ',
        overrides.faceValue ?? 50000,
        overrides.pointsPrice ?? 500,
        overrides.validUntil ?? new Date(Date.now() + 30 * 86_400_000),
        overrides.status ?? 'active',
      ],
    );
    return Number(result.insertId);
  };

  const storedValue = async (): Promise<number> => {
    const [row] = await dataSource.query(
      `SELECT point_value_vnd FROM program_settings WHERE id = 1`,
    );
    return row.point_value_vnd;
  };

  it('reads the point value', async () => {
    const res = await get().expect(200);

    expect(res.body).toEqual({ pointValueVnd: 100 });
  });

  it('rejects a request without an admin token', async () => {
    await request(app.getHttpServer()).get('/settings').expect(401);
    await request(app.getHttpServer())
      .patch('/settings')
      .send({ pointValueVnd: 120 })
      .expect(401);
    expect(await storedValue()).toBe(100);
  });

  it('changes the point value', async () => {
    const res = await patch({ pointValueVnd: 120 }).expect(200);

    expect(res.body).toEqual({ pointValueVnd: 120 });
    expect(await storedValue()).toBe(120);
    expect((await get().expect(200)).body).toEqual({ pointValueVnd: 120 });
  });

  it.each([
    ['empty body', {}],
    ['zero', { pointValueVnd: 0 }],
    ['negative', { pointValueVnd: -1 }],
    ['fraction', { pointValueVnd: 1.5 }],
    ['string', { pointValueVnd: '100' }],
    ['above the cap', { pointValueVnd: 100_001 }],
    ['unknown field', { pointValueVnd: 100, extra: 1 }],
  ])('rejects %s', async (_name, payload) => {
    await patch(payload).expect(400);
    expect(await storedValue()).toBe(100);
  });

  it('keeps a voucher that sits exactly on the floor', async () => {
    await insertVoucher({ faceValue: 50000, pointsPrice: 500 });

    await patch({ pointValueVnd: 100 }).expect(200);
  });

  it('lowers the value whatever the vouchers are', async () => {
    await insertVoucher({ faceValue: 50000, pointsPrice: 500 });

    await patch({ pointValueVnd: 50 }).expect(200);
    expect(await storedValue()).toBe(50);
  });

  it('refuses a value that puts a sellable voucher under its floor', async () => {
    const id = await insertVoucher({ faceValue: 50000, pointsPrice: 500 });

    const res = await patch({ pointValueVnd: 101 }).expect(409);

    expect(res.body.message).toContain(`#${id}`);
    expect(res.body.message).toContain('Giảm 50.000đ');
    expect(await storedValue()).toBe(100);
  });

  it('ignores expired and retired vouchers', async () => {
    await insertVoucher({ validUntil: new Date(Date.now() - 1000) });
    await insertVoucher({ status: 'expired' });

    await patch({ pointValueVnd: 200 }).expect(200);
  });

  it('names at most five vouchers and counts the rest', async () => {
    for (let i = 1; i <= 7; i++) {
      await insertVoucher({ title: `Voucher ${i}` });
    }

    const res = await patch({ pointValueVnd: 101 }).expect(409);

    expect(res.body.message).toContain('7 vouchers');
    expect(res.body.message).toContain('and 2 more');
  });

  it('makes a voucher being created wait for a value change in flight', async () => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(
        `SELECT 1 FROM program_settings WHERE id = 1 FOR UPDATE`,
      );

      let settled = false;
      const created = request(app.getHttpServer())
        .post('/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchantId,
          title: 'Giảm 50.000đ',
          faceValue: 50000,
          pointsPrice: 500,
          stock: 10,
          validUntil: new Date(
            Math.floor(Date.now() / 1000) * 1000 + 30 * 86_400_000,
          ).toISOString(),
        })
        .then((res) => {
          settled = true;
          return res;
        });
      await new Promise((resolve) => setTimeout(resolve, 300));
      const settledWhileLocked = settled;

      await runner.query(
        `UPDATE program_settings SET point_value_vnd = 200 WHERE id = 1`,
      );
      await runner.commitTransaction();

      const res = await created;
      expect(settledWhileLocked).toBe(false);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('below the floor');
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
