import { Ledger } from './ledger';
import { InMemoryLedgerStorage } from './in-memory-storage';
import { DuplicateKeyError } from './storage';

describe('ledger', () => {
  let ledger: Ledger<undefined>;
  const tx = undefined;
  const now = new Date('2026-01-10T00:00:00Z');
  beforeEach(() => {
    ledger = new Ledger(new InMemoryLedgerStorage<undefined>());
  });

  it('earn adds to the balance', async () => {
    await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
    });

    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(100);
  });

  it('counts the same merchant key only once', async () => {
    const input = {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
    };

    const first = await ledger.earn(tx, input);
    const second = await ledger.earn(tx, input);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.lot.id).toBe(first.lot.id);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(100);
  });

  it('allows different merchants to use the same key', async () => {
    const first = await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 10,
      idempotencyKey: 'same-key',
    });
    const second = await ledger.earn(tx, {
      merchantId: 'merchant2',
      memberId: 'member1',
      points: 20,
      idempotencyKey: 'same-key',
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(false);
    expect(second.lot.id).not.toBe(first.lot.id);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(30);
  });

  it('returns zero for a member with no lots', async () => {
    await expect(ledger.balance(tx, 'member-without-lots', now)).resolves.toBe(
      0,
    );
  });

  it.each([0, -5, 1.5])('rejects invalid points: %s', async (points) => {
    await expect(
      ledger.earn(tx, {
        merchantId: 'merchant1',
        memberId: 'member1',
        points,
        idempotencyKey: 'key1',
      }),
    ).rejects.toThrow('Points must be a positive integer');
  });

  it('keeps keys apart when ids contain the separator', async () => {
    const base = { memberId: 'member1', points: 10 };
    const first = await ledger.earn(tx, {
      ...base,
      merchantId: '1:2',
      idempotencyKey: '3',
    });
    const second = await ledger.earn(tx, {
      ...base,
      merchantId: '1',
      idempotencyKey: '2:3',
    });

    expect(second.duplicate).toBe(false);
    expect(second.lot.id).not.toBe(first.lot.id);
  });

  it('does not let callers change stored lots', async () => {
    const input = {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
    };
    const first = await ledger.earn(tx, input);
    first.lot.remaining = 0;
    const second = await ledger.earn(tx, input);
    second.lot.remaining = 0;

    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(100);
  });

  it('throws when storage reports a duplicate but finds no lot', async () => {
    const storage = new InMemoryLedgerStorage<undefined>();
    jest.spyOn(storage, 'insertLot').mockRejectedValue(new DuplicateKeyError());
    const broken = new Ledger(storage);

    await expect(
      broken.earn(tx, {
        merchantId: 'merchant1',
        memberId: 'member1',
        points: 10,
        idempotencyKey: 'key1',
      }),
    ).rejects.toThrow('no existing lot was found');
  });
});
