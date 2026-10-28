import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('ledger_lots table', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let merchantId: number;
  let memberId: number;
  const apiKey = 'test-api-key';
  const memberEmail = 'john@example.com';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM ledger_lots');
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM members');
    await dataSource.query('DELETE FROM tiers');
    await dataSource.query('DELETE FROM merchants');
    const merchant = await dataSource.query(
      `INSERT INTO merchants (name, api_key_hash) VALUES ('Shop A', ?)`,
      [createHash('sha256').update(apiKey).digest('hex')],
    );
    merchantId = Number(merchant.insertId);
    const tier = await dataSource.query(
      `INSERT INTO tiers (name, min_points, earn_rate) VALUES ('Bronze', 0, 1.00)`,
    );
    const member = await dataSource.query(
      `INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, ?, 'John Doe')`,
      [merchantId, Number(tier.insertId), memberEmail],
    );
    memberId = Number(member.insertId);
  });

  afterAll(async () => {
    await app.close();
  });

  const insertLot = (
    points: number,
    idempotencyKey: string,
    remaining: number = points,
    expiresAt: Date | null = null,
  ) =>
    dataSource.query(
      `INSERT INTO ledger_lots
      (merchant_id, member_id, points, remaining, expires_at, idempotency_key)
     VALUES (?, ?, ?, ?, ?, ?)`,
      [merchantId, memberId, points, remaining, expiresAt, idempotencyKey],
    );

  it('rejects a second lot with the same (merchant, key) with ER_DUP_ENTRY', async () => {
    await insertLot(100, 'key-A');
    await expect(insertLot(200, 'key-A')).rejects.toMatchObject({
      driverError: { code: 'ER_DUP_ENTRY' },
    });
  });

  it('rejects points = 0 (CHECK constraint)', async () => {
    await expect(insertLot(0, 'key-A')).rejects.toMatchObject({
      driverError: { code: 'ER_CHECK_CONSTRAINT_VIOLATED' },
    });
  });
});
