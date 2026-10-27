import { InMemoryLedgerStorage } from './in-memory-storage';
import { Ledger } from './ledger';

describe('Ledger.spend', () => {
  let ledger: Ledger<undefined>;
  const tx = undefined;
  const now = new Date('2026-01-10T00:00:00Z');
  const oneDayMs = 24 * 60 * 60 * 1000;
  beforeEach(() => {
    ledger = new Ledger(new InMemoryLedgerStorage<undefined>());
  });
  it('spends less than one lot -> consumed has one entry, balance goes down by that amount', async () => {
    const lot = await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
    });

    const spendResult = await ledger.spend(tx, {
      memberId: 'member1',
      points: 30,
      now,
    });

    expect(spendResult.consumed).toEqual([{ lotId: lot.lot.id, points: 30 }]);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(70);
  });
  it('spends across two lots -> the lot with the earlier expiresAt is drained first', async () => {
    const lot1 = await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() + oneDayMs), // expires in 1 day
    });
    const lot2 = await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key2',
      expiresAt: new Date(now.getTime() + 2 * oneDayMs), // expires in 2 days
    });
    const spendResult = await ledger.spend(tx, {
      memberId: 'member1',
      points: 150,
      now,
    });
    expect(spendResult.consumed).toEqual([
      { lotId: lot1.lot.id, points: 100 },
      { lotId: lot2.lot.id, points: 50 },
    ]);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(50);
  });
  it('a lot with expiresAt null is consumed after lots that expire', async () => {
    const lot1 = await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() + oneDayMs),
    });
    const lot2 = await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key2',
      expiresAt: null, // never expires
    });
    const spendResult = await ledger.spend(tx, {
      memberId: 'member1',
      points: 150,
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
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() + oneDayMs),
    });
    const lot2 = await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key2',
      expiresAt: new Date(now.getTime() + oneDayMs),
    });
    const spendResult = await ledger.spend(tx, {
      memberId: 'member1',
      points: 150,
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
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() + oneDayMs),
    });
    await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key2',
      expiresAt: new Date(now.getTime() - oneDayMs),
    });
    const lot2 = await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key3',
      expiresAt: new Date(now.getTime() + 2 * oneDayMs),
    });
    const spendResult = await ledger.spend(tx, {
      memberId: 'member1',
      points: 150,
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
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() + oneDayMs),
    });
    // No await before spend: expect needs the promise itself to check the rejection.
    const spendPromise = ledger.spend(tx, {
      memberId: 'member1',
      points: 150,
      now,
    });
    await expect(spendPromise).rejects.toThrow(
      'Not enough points to spend: requested 150, available 100',
    );
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(100);
  });
  it('no lots at all -> spend rejects with "no available lots"', async () => {
    await expect(
      ledger.spend(tx, { memberId: 'member1', points: 50, now }),
    ).rejects.toThrow(
      'Not enough points to spend: requested 50, no available lots',
    );
  });
  it('only an expired lot -> spend rejects with "no available lots"', async () => {
    await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() - oneDayMs),
    });
    await expect(
      ledger.spend(tx, { memberId: 'member1', points: 50, now }),
    ).rejects.toThrow(
      'Not enough points to spend: requested 50, no available lots',
    );
  });
  it.each([0, -5, 1.5])(
    'points %s -> rejects (table-driven with it.each)',
    async (points) => {
      await expect(
        ledger.spend(tx, { memberId: 'member1', points, now }),
      ).rejects.toThrow('Points must be a positive integer');
    },
  );
});
