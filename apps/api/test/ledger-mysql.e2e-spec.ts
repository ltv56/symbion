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

  const balance = () => inTx((tx) => ledger.balance(tx, String(memberId), now));

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

  const spend = (points: number, idempotencyKey = 'spend-1') =>
    inTx((tx) =>
      ledger.spend(tx, {
        now,
        merchantId: String(merchantId),
        memberId: String(memberId),
        points,
        idempotencyKey,
      }),
    );

  const earn = (points: number, idempotencyKey = 'earn-1') =>
    inTx((tx) =>
      ledger.earn(tx, {
        now,
        merchantId: String(merchantId),
        memberId: String(memberId),
        points,
        idempotencyKey,
      }),
    );

  const remainingOf = async (key: string) => {
    const rows = await dataSource.query(
      `SELECT remaining FROM ledger_lots WHERE idempotency_key = ?`,
      [key],
    );
    return Number(rows[0].remaining);
  };

  const debtRemainings = async () => {
    const rows: { remaining: string }[] = await dataSource.query(
      `SELECT remaining FROM ledger_lots
      WHERE member_id = ? AND remaining < 0
      ORDER BY id`,
      [memberId],
    );
    return rows.map((row) => Number(row.remaining));
  };

  const positiveRemainings = async () => {
    const rows: { remaining: string }[] = await dataSource.query(
      `SELECT remaining FROM ledger_lots
      WHERE member_id = ? AND remaining > 0
      ORDER BY id`,
      [memberId],
    );
    return rows.map((row) => Number(row.remaining));
  };

  describe('1. table and unique key', () => {
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

  describe('2. earn + balance', () => {
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

  describe('3. FIFO spend', () => {
    const lotId = async (key: string) => {
      const rows = await dataSource.query(
        `SELECT id FROM ledger_lots WHERE idempotency_key = ?`,
        [key],
      );
      return String(rows[0].id);
    };

    it('spends the lot that expires first', async () => {
      await insertLot(100, 'late', 100, new Date('2026-03-01T00:00:00Z'));
      await insertLot(100, 'early', 100, new Date('2026-02-01T00:00:00Z'));

      const result = await spend(50);

      expect(result.consumed).toEqual([
        { lotId: await lotId('early'), points: 50 },
      ]);
      expect(result.debt).toBe(0);
      await expect(remainingOf('early')).resolves.toBe(50);
      await expect(remainingOf('late')).resolves.toBe(100);
    });

    it('spends lots with no expiry last, and the lower id first on a tie', async () => {
      await insertLot(30, 'none');
      await insertLot(10, 'a', 10, new Date('2026-02-01T00:00:00Z'));
      await insertLot(20, 'b', 20, new Date('2026-02-01T00:00:00Z'));

      const result = await spend(60);

      expect(result.consumed).toEqual([
        { lotId: await lotId('a'), points: 10 },
        { lotId: await lotId('b'), points: 20 },
        { lotId: await lotId('none'), points: 30 },
      ]);
      await expect(balance()).resolves.toBe(0);
    });

    it('skips expired lots and lots with remaining = 0', async () => {
      await insertLot(100, 'expired', 100, new Date('2026-01-01T00:00:00Z'));
      await insertLot(100, 'empty', 0);
      await insertLot(100, 'valid', 100, new Date('2026-02-01T00:00:00Z'));

      const result = await spend(30);

      expect(result.consumed).toEqual([
        { lotId: await lotId('valid'), points: 30 },
      ]);
      await expect(remainingOf('expired')).resolves.toBe(100);
      await expect(remainingOf('empty')).resolves.toBe(0);
      await expect(remainingOf('valid')).resolves.toBe(70);
    });

    it('lowers the balance by the amount spent', async () => {
      await insertLot(100, 'lot');

      await spend(30);

      await expect(balance()).resolves.toBe(70);
    });
  });

  describe('4. debt lots', () => {
    it('spend more than the balance: shortfall becomes debt, balance goes negative', async () => {
      await insertLot(20, 'lot');

      const result = await spend(50);

      expect(result.debt).toBe(30);
      await expect(debtRemainings()).resolves.toEqual([-30]);
      await expect(remainingOf('lot')).resolves.toBe(0);
      await expect(balance()).resolves.toBe(-30);
    });

    it('earn smaller than the debt: new lot has remaining 0, debt lot shrinks', async () => {
      await spend(150, 'spend-1');

      const { lot } = await earn(100);

      expect(lot.points).toBe(100);
      expect(lot.remaining).toBe(0);
      await expect(debtRemainings()).resolves.toEqual([-50]);
      await expect(balance()).resolves.toBe(-50);
    });

    it('earn bigger than the debt: debt is cleared, the rest stays in the new lot', async () => {
      await spend(40, 'spend-1');

      const { lot } = await earn(100);

      expect(lot.remaining).toBe(60);
      await expect(debtRemainings()).resolves.toEqual([]);
      await expect(balance()).resolves.toBe(60);
    });

    it('two debt lots are paid oldest first', async () => {
      await spend(30, 'spend-1');
      await spend(20, 'spend-2');
      await expect(debtRemainings()).resolves.toEqual([-30, -20]);

      await earn(40);

      await expect(remainingOf('spend-1')).resolves.toBe(0);
      await expect(remainingOf('spend-2')).resolves.toBe(-10);
      await expect(balance()).resolves.toBe(-10);
    });

    it('same earn key twice does not pay the debt twice', async () => {
      await spend(40, 'spend-1');

      const first = await earn(100);
      const second = await earn(100);

      expect(first.duplicate).toBe(false);
      expect(second.duplicate).toBe(true);
      await expect(balance()).resolves.toBe(60);
    });
  });

  describe('5. parallel spend', () => {
    it('10 parallel spends of 10 on one lot of 50: no lot goes negative, balance is exact', async () => {
      await insertLot(50, 'lot');

      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) => spend(10, `spend-${i}`)),
      );

      const consumed = results
        .flatMap((result) => result.consumed)
        .reduce((sum, item) => sum + item.points, 0);
      const debt = results.reduce((sum, result) => sum + result.debt, 0);
      expect(consumed).toBe(50);
      expect(debt).toBe(50);
      await expect(remainingOf('lot')).resolves.toBe(0);
      await expect(balance()).resolves.toBe(-50);
    });

    it('parallel earn and spend with an existing debt: debt lot and positive lot never coexist', async () => {
      await spend(40, 'spend-1');

      await Promise.all([earn(100, 'earn-1'), spend(70, 'spend-2')]);

      // earn first: lot 60 is taken by the spend, debt 10 left.
      // spend first: debt 110, earn pays 100, debt 10 left.
      const debts = await debtRemainings();
      const positives = await positiveRemainings();
      expect(debts.length === 0 || positives.length === 0).toBe(true);
      await expect(balance()).resolves.toBe(-10);
    });
  });

  describe('6. storage precision and limits', () => {
    const earnWith = (key: string, expiresAt?: Date) =>
      inTx((tx) =>
        ledger.earn(tx, {
          now,
          merchantId: String(merchantId),
          memberId: String(memberId),
          points: 100,
          idempotencyKey: key,
          expiresAt,
        }),
      );

    it('keeps the milliseconds of expires_at', async () => {
      await earnWith('ms', new Date('2026-01-10T00:00:00.500Z'));

      await expect(
        inTx((tx) =>
          ledger.balance(
            tx,
            String(memberId),
            new Date('2026-01-10T00:00:00.300Z'),
          ),
        ),
      ).resolves.toBe(100);
      await expect(
        inTx((tx) =>
          ledger.balance(
            tx,
            String(memberId),
            new Date('2026-01-10T00:00:00.700Z'),
          ),
        ),
      ).resolves.toBe(0);
    });

    it('treats keys that differ only by trailing spaces as different keys', async () => {
      const first = await earnWith('key');
      const second = await earnWith('key ');

      expect(first.duplicate).toBe(false);
      expect(second.duplicate).toBe(false);
      await expect(balance()).resolves.toBe(200);
    });

    it('fails loudly when a lot id is above the safe integer range', async () => {
      await dataSource.query(
        `INSERT INTO ledger_lots
        (id, merchant_id, member_id, points, remaining, idempotency_key)
        VALUES (9007199254740993, ?, ?, 10, 10, 'big-id')`,
        [merchantId, memberId],
      );

      try {
        await expect(earnWith('big-id')).rejects.toThrow('not a safe integer');
      } finally {
        // The explicit id moved AUTO_INCREMENT past 2^53; reset it or later tests get unsafe ids.
        await dataSource.query('DELETE FROM ledger_lots');
        await dataSource.query('ALTER TABLE ledger_lots AUTO_INCREMENT = 1');
      }
    });

    it('has an index for debt reads', async () => {
      const rows: { Key_name: string }[] = await dataSource.query(
        `SHOW INDEX FROM ledger_lots WHERE Key_name = 'idx_ledger_lots_member_remaining'`,
      );

      expect(rows.length).toBeGreaterThan(0);
    });
  });
});
