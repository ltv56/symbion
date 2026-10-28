import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Ledger } from '@symbion/ledger';
import { DataSource, EntityManager } from 'typeorm';
import { AppModule } from '../src/app.module';
import { MysqlLedgerStorage } from '../src/ledger/mysql-ledger.storage';

describe('MysqlLedgerStorage', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let merchantId: number;
  let memberId: number;
  let ledger: Ledger<EntityManager>;
  const apiKey = 'test-api-key';
  const memberEmail = 'john@example.com';
  const now = new Date('2026-01-10T00:00:00Z');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    ledger = new Ledger<EntityManager>(new MysqlLedgerStorage());
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

  const inTx = <T>(fn: (tx: EntityManager) => Promise<T>) =>
    dataSource.transaction(fn);

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

  describe('slice 1: table and unique key', () => {
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

  describe('slice 2: earn + balance', () => {
    const earnInput = (
      overrides: { expiresAt?: Date; points?: number } = {},
    ) => ({
      now,
      merchantId: String(merchantId),
      memberId: String(memberId),
      points: 100,
      idempotencyKey: 'key-A',
      ...overrides,
    });
    const balance = () =>
      inTx((tx) => ledger.balance(tx, String(memberId), now));

    it('earn adds a lot and balance returns it', async () => {
      const result = await inTx((tx) => ledger.earn(tx, earnInput()));

      expect(result.duplicate).toBe(false);
      await expect(balance()).resolves.toBe(100);
    });

    it('same earn key twice adds points once and returns duplicate: true', async () => {
      const first = await inTx((tx) => ledger.earn(tx, earnInput()));
      const second = await inTx((tx) => ledger.earn(tx, earnInput()));

      expect(first.duplicate).toBe(false);
      expect(second.duplicate).toBe(true);
      expect(second.lot.id).toBe(first.lot.id);
      await expect(balance()).resolves.toBe(100);
    });

    it('parallel earns with the same key add points once', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          inTx((tx) => ledger.earn(tx, earnInput())),
        ),
      );

      expect(results.filter((r) => !r.duplicate)).toHaveLength(1);
      expect(results.filter((r) => r.duplicate)).toHaveLength(9);
      await expect(balance()).resolves.toBe(100);
    });

    it('balance ignores expired lots', async () => {
      await inTx((tx) =>
        ledger.earn(
          tx,
          earnInput({ expiresAt: new Date('2026-01-01T00:00:00Z') }),
        ),
      );

      await expect(balance()).resolves.toBe(0);
    });
  });
});
