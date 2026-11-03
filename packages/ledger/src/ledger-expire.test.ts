import { InMemoryLedgerStorage } from './in-memory-storage';
import { Ledger } from './ledger';

describe('Ledger.expire', () => {
  let ledger: Ledger<undefined>;
  let storage: InMemoryLedgerStorage<undefined>;
  const tx = undefined;
  const t0 = new Date('2026-01-10T00:00:00Z');
  const day = 24 * 60 * 60 * 1000;
  const later = new Date(t0.getTime() + 10 * day);
  beforeEach(() => {
    storage = new InMemoryLedgerStorage();
    ledger = new Ledger(storage);
  });

  const earn = (key: string, points: number, expiresInDays: number | null) =>
    ledger.earn(tx, {
      now: t0,
      merchantId: 'merchant1',
      memberId: 'member1',
      points,
      idempotencyKey: key,
      expiresAt:
        expiresInDays === null
          ? null
          : new Date(t0.getTime() + expiresInDays * day),
    });

  it('expires what is left of an expired lot and keeps the balance', async () => {
    const { lot } = await earn('k1', 100, 5);

    const result = await ledger.expire(tx, { memberId: 'member1', now: later });

    expect(result.expired).toEqual([{ lotId: lot.id, points: 100 }]);
    await expect(
      storage.findExpiredLots(tx, 'member1', later),
    ).resolves.toEqual([]);
    await expect(ledger.balance(tx, 'member1', later)).resolves.toBe(0);
  });

  it('writes an expire entry that points back at the lot', async () => {
    const { lot } = await earn('k1', 100, 5);

    await ledger.expire(tx, { memberId: 'member1', now: later });

    const entry = await storage.findLotByKey(
      tx,
      'merchant1',
      `expire:${lot.id}`,
    );
    expect(entry).toMatchObject({
      type: 'expire',
      points: -100,
      remaining: 0,
      ref: { type: 'lot', id: lot.id },
    });
  });

  it('expires only the part that was not spent', async () => {
    const { lot } = await earn('k1', 100, 5);
    await ledger.spend(tx, {
      now: t0,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 30,
      idempotencyKey: 's1',
    });

    const result = await ledger.expire(tx, { memberId: 'member1', now: later });

    expect(result.expired).toEqual([{ lotId: lot.id, points: 70 }]);
  });

  it('leaves lots that are not expired yet, lots without expiry and debt alone', async () => {
    await earn('soon', 50, 20);
    await earn('never', 40, null);
    await ledger.spend(tx, {
      now: t0,
      merchantId: 'merchant1',
      memberId: 'other',
      points: 10,
      idempotencyKey: 'debt',
    });

    const mine = await ledger.expire(tx, { memberId: 'member1', now: later });
    const other = await ledger.expire(tx, { memberId: 'other', now: later });

    expect(mine.expired).toEqual([]);
    expect(other.expired).toEqual([]);
    await expect(ledger.balance(tx, 'member1', later)).resolves.toBe(90);
    await expect(ledger.balance(tx, 'other', later)).resolves.toBe(-10);
  });

  it('writes nothing on a second run', async () => {
    await earn('k1', 100, 5);
    await ledger.expire(tx, { memberId: 'member1', now: later });

    const second = await ledger.expire(tx, { memberId: 'member1', now: later });

    expect(second.expired).toEqual([]);
  });

  it('expires several lots oldest id first', async () => {
    const a = await earn('a', 10, 3);
    const b = await earn('b', 20, 4);

    const result = await ledger.expire(tx, { memberId: 'member1', now: later });

    expect(result.expired).toEqual([
      { lotId: a.lot.id, points: 10 },
      { lotId: b.lot.id, points: 20 },
    ]);
  });
});
