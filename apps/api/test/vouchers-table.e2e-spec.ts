import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

interface VoucherOverrides {
  merchant: number;
  faceValue: number;
  pointsPrice: number;
  status: string;
}

describe('vouchers and program_settings tables', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let merchantId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
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
    // other e2e files delete merchants; leftover vouchers would block that (FK)
    await dataSource.query('DELETE FROM vouchers');
    await app.close();
  });

  const insertVoucher = (overrides: Partial<VoucherOverrides> = {}) => {
    const v = {
      merchant: merchantId,
      faceValue: 50000,
      pointsPrice: 500,
      ...overrides,
    };
    const columns = [
      'merchant_id',
      'title',
      'face_value',
      'points_price',
      'stock',
      'valid_until',
    ];
    const values: unknown[] = [
      v.merchant,
      'Voucher',
      v.faceValue,
      v.pointsPrice,
      100,
      new Date(Date.now() + 86_400_000),
    ];
    if (v.status !== undefined) {
      columns.push('status');
      values.push(v.status);
    }
    return dataSource.query(
      `INSERT INTO vouchers (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      values,
    );
  };

  it('has exactly one settings row with the point value', async () => {
    const rows = await dataSource.query(
      'SELECT id, point_value_vnd FROM program_settings',
    );
    expect(rows).toEqual([{ id: 1, point_value_vnd: 100 }]);
  });

  it('rejects a second settings row', async () => {
    await expect(
      dataSource.query(
        'INSERT INTO program_settings (id, point_value_vnd) VALUES (2, 100)',
      ),
    ).rejects.toThrow();
  });

  it('rejects a zero point value', async () => {
    await expect(
      dataSource.query('UPDATE program_settings SET point_value_vnd = 0'),
    ).rejects.toThrow();
  });

  it('stores a voucher as active by default', async () => {
    await insertVoucher();
    const rows = await dataSource.query('SELECT status FROM vouchers');
    expect(rows).toEqual([{ status: 'active' }]);
  });

  it.each<[string, Partial<VoucherOverrides>]>([
    ['a zero face_value', { faceValue: 0 }],
    ['a zero points_price', { pointsPrice: 0 }],
    ['an unknown status', { status: 'paused' }],
  ])('rejects %s', async (_name, overrides) => {
    await expect(insertVoucher(overrides)).rejects.toThrow();
  });

  it('rejects an unknown merchant', async () => {
    await expect(
      insertVoucher({ merchant: merchantId + 1000 }),
    ).rejects.toThrow();
  });
});
