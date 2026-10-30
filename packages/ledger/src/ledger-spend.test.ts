import { InMemoryLedgerStorage } from './in-memory-storage';
import { Ledger } from './ledger';

describe('Ledger.spend', () => {
  let storage: InMemoryLedgerStorage<undefined>;
  let ledger: Ledger<undefined>;
  const tx = undefined;
  const now = new Date('2026-01-10T00:00:00Z');
  const oneDayMs = 24 * 60 * 60 * 1000;
  beforeEach(() => {
    storage = new InMemoryLedgerStorage<undefined>();
    ledger = new Ledger(storage);
  });
  it('writes the spend entry with type spend and no ref', async () => {
    await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
    });

    await ledger.spend(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 30,
      idempotencyKey: 'spend-key',
      now,
    });

    const entry = await storage.findLotByKey(tx, 'merchant1', 'spend-key');
    expect(entry).toMatchObject({ type: 'spend', ref: null, points: -30 });
  });

  it('stores the caller ref on the spend entry', async () => {
    await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
    });

    await ledger.spend(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 30,
      idempotencyKey: 'spend-key',
      now,
      ref: { type: 'redemption', id: '7' },
    });

    const entry = await storage.findLotByKey(tx, 'merchant1', 'spend-key');
    expect(entry?.ref).toEqual({ type: 'redemption', id: '7' });
  });

  it('spends less than one lot -> consumed has one entry, balance goes down by that amount', async () => {
    const lot = await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
    });

    const spendResult = await ledger.spend(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 30,
      idempotencyKey: 'spend-key',
      now,
    });

    expect(spendResult.consumed).toEqual([{ lotId: lot.lot.id, points: 30 }]);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(70);
  });
  it('spends across two lots -> the lot with the earlier expiresAt is drained first', async () => {
    const lot1 = await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() + oneDayMs), // expires in 1 day
    });
    const lot2 = await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key2',
      expiresAt: new Date(now.getTime() + 2 * oneDayMs), // expires in 2 days
    });
    const spendResult = await ledger.spend(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 150,
      now,
      idempotencyKey: 'spend-key',
    });
    expect(spendResult.consumed).toEqual([
      { lotId: lot1.lot.id, points: 100 },
      { lotId: lot2.lot.id, points: 50 },
    ]);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(50);
  });
  it('a lot with expiresAt null is consumed after lots that expire', async () => {
    const lot1 = await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() + oneDayMs),
    });
    const lot2 = await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key2',
      expiresAt: null, // never expires
    });
    const spendResult = await ledger.spend(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 150,
      idempotencyKey: 'spend-key',
      now,
    });
    expect(spendResult.consumed).toEqual([
      { lotId: lot1.lot.id, points: 100 },
      { lotId: lot2.lot.id, points: 50 },
    ]);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(50);
  });
  it('same expiresAt -> the lot with the lower id is consumed first (earn it first)', async () => {
    const lot1 = await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() + oneDayMs),
    });
    const lot2 = await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key2',
      expiresAt: new Date(now.getTime() + oneDayMs),
    });
    const spendResult = await ledger.spend(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 150,
      idempotencyKey: 'spend-key',
      now,
    });
    expect(spendResult.consumed).toEqual([
      { lotId: lot1.lot.id, points: 100 },
      { lotId: lot2.lot.id, points: 50 },
    ]);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(50);
  });
  it('an expired lot is skipped', async () => {
    const lot1 = await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() + oneDayMs),
    });
    await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key2',
      expiresAt: new Date(now.getTime() - oneDayMs),
    });
    const lot2 = await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key3',
      expiresAt: new Date(now.getTime() + 2 * oneDayMs),
    });
    const spendResult = await ledger.spend(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 150,
      idempotencyKey: 'spend-key',
      now,
    });
    expect(spendResult.consumed).toEqual([
      { lotId: lot1.lot.id, points: 100 },
      { lotId: lot2.lot.id, points: 50 },
    ]);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(50);
  });
  it('not enough balance -> spend rejects AND balance is unchanged (nothing half-spent)', async () => {
    await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() + oneDayMs),
    });
    const spendPromise = await ledger.spend(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 150,
      idempotencyKey: 'spend-key',
      now,
    });
    expect(spendPromise.debt).toBe(50);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(-50);
  });
  it('only an expired lot', async () => {
    await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() - oneDayMs),
    });
    const spendPromise = await ledger.spend(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 50,
      idempotencyKey: 'spend-key',
      now,
    });
    expect(spendPromise.debt).toBe(50);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(-50);
  });
  it.each([0, -5, 1.5, 2 ** 53])(
    'points %s -> rejects (table-driven with it.each)',
    async (points) => {
      await expect(
        ledger.spend(tx, {
          merchantId: 'merchant1',
          memberId: 'member1',
          points,
          idempotencyKey: 'spend-key',
          now,
        }),
      ).rejects.toThrow('Points must be a positive integer');
    },
  );
});
