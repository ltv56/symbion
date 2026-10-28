import { InMemoryLedgerStorage } from './in-memory-storage';
import { Ledger } from './ledger';

describe('Ledger.earn with existing debt', () => {
  let ledger: Ledger<undefined>;
  let storage: InMemoryLedgerStorage<undefined>;
  const tx = undefined;
  const now = new Date('2026-01-10T00:00:00Z');
  beforeEach(() => {
    storage = new InMemoryLedgerStorage();
    ledger = new Ledger(storage);
  });

  // Debt is built with the real path (spend with no points), keys are unique per call.
  const spend = (points: number, idempotencyKey: string) =>
    ledger.spend(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points,
      now,
      idempotencyKey,
    });
  const earn = (points: number, idempotencyKey: string) =>
    ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points,
      idempotencyKey,
    });

  it('earn smaller than debt: debt 150, earn 100 -> new lot remaining 0, debt lot -50, balance -50', async () => {
    await spend(150, 'spend-1');

    const { lot } = await earn(100, 'earn-1');

    expect(lot.points).toBe(100);
    expect(lot.remaining).toBe(0);
    const debtLots = await storage.findDebtLots(tx, 'member1');
    expect(debtLots.map((lot) => lot.remaining)).toEqual([-50]);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(-50);
  });

  it('earn bigger than debt: debt 40, earn 100 -> new lot remaining 60, no debt lot, balance 60', async () => {
    await spend(40, 'spend-1');

    const { lot } = await earn(100, 'earn-1');

    expect(lot.points).toBe(100);
    expect(lot.remaining).toBe(60);
    await expect(storage.findDebtLots(tx, 'member1')).resolves.toEqual([]);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(60);
  });

  it('two debt lots are paid oldest first', async () => {
    await spend(30, 'spend-1');
    await spend(20, 'spend-2');
    const before = await storage.findDebtLots(tx, 'member1');
    const ids = before.map((lot) => lot.id);

    await earn(40, 'earn-1');

    expect(ids).toHaveLength(2);
    const debtLots = await storage.findDebtLots(tx, 'member1');
    expect(
      debtLots.map((lot) => ({ id: lot.id, remaining: lot.remaining })),
    ).toEqual([{ id: ids[1], remaining: -10 }]);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(-10);
  });

  it('duplicate earn does not pay the debt twice', async () => {
    await spend(40, 'spend-1');
    await earn(100, 'earn-1');

    const second = await earn(100, 'earn-1');

    expect(second.duplicate).toBe(true);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(60);
  });

  it('after earn, spend does not need to know old debt: debt 40, earn 100, spend 70 -> debt 10, balance -10', async () => {
    await spend(40, 'spend-1');
    const { lot } = await earn(100, 'earn-1');

    const result = await spend(70, 'spend-2');

    expect(result.consumed).toEqual([{ lotId: lot.id, points: 60 }]);
    expect(result.debt).toBe(10);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(-10);
  });

  it('an earn that is already expired does not pay debt: debt 40, earn 100 expiring now -> debt stays, balance -40', async () => {
    await spend(40, 'spend-1');

    const { lot } = await ledger.earn(tx, {
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'earn-1',
      expiresAt: now,
      now,
    });

    expect(lot.remaining).toBe(100);
    const debtLots = await storage.findDebtLots(tx, 'member1');
    expect(debtLots.map((debtLot) => debtLot.remaining)).toEqual([-40]);
    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(-40);
  });
});
