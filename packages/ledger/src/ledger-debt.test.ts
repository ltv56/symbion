import { InMemoryLedgerStorage } from './in-memory-storage';
import { Ledger } from './ledger';
import { DuplicateKeyError } from './storage';

describe('Ledger.spend with debt', () => {
  let ledger: Ledger<undefined>;
  let storage: InMemoryLedgerStorage<undefined>;
  const tx = undefined;
  const now = new Date('2026-01-10T00:00:00Z');
  beforeEach(() => {
    storage = new InMemoryLedgerStorage();
    ledger = new Ledger(storage);
  });

  it('spend more than the balance -> lots drained, debt = shortfall, balance negative', async () => {
    const lot = await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });
    const spendResult = await ledger.spend(tx, {
      memberId: 'member1',
      merchantId: 'merchant1',
      points: 150,
      now,
      idempotencyKey: 'spend-key',
    });
    expect(spendResult.consumed).toEqual([{ lotId: lot.lot.id, points: 100 }]);
    expect(spendResult.debt).toBe(50);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(-50);
  });

  it('spend with no lots at all -> debt = points, balance = -points', async () => {
    const spendResult = await ledger.spend(tx, {
      memberId: 'member1',
      merchantId: 'merchant1',
      points: 150,
      now,
      idempotencyKey: 'spend-key',
    });
    expect(spendResult.debt).toBe(150);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(-150);
  });

  it('spend exactly the balance -> debt is 0 and no debt lot is created', async () => {
    await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });

    const spendResult = await ledger.spend(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      now,
      idempotencyKey: 'spend-key',
    });
    await expect(storage.findDebtLots(tx, 'member1')).resolves.toEqual([]);
    expect(spendResult.debt).toBe(0);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(0);
  });

  it('expired lot does not count: only expired lot + spend 50 -> debt 50', async () => {
    await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    });
    const spend = await ledger.spend(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 50,
      now,
      idempotencyKey: 'spend-key1',
    });
    await expect(
      storage.findSpendableLots(tx, 'member1', now),
    ).resolves.toEqual([]);
    expect(spend.debt).toBe(50);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(-50);
  });

  it('same idempotencyKey twice with too few points -> second spend rejects with DuplicateKeyError and balance stays', async () => {
    const input = {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 50,
      now,
      idempotencyKey: 'spend-key',
    };
    await ledger.spend(tx, input);

    await expect(ledger.spend(tx, input)).rejects.toThrow(DuplicateKeyError);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(-50);
  });
});
