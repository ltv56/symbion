import { InMemoryLedgerStorage } from './in-memory-storage';
import { Ledger } from './ledger';

describe('Ledger idempotency key', () => {
  let ledger: Ledger<undefined>;
  const tx = undefined;
  const now = new Date('2026-01-10T00:00:00Z');
  const input = (idempotencyKey: string) => ({
    now,
    merchantId: 'merchant1',
    memberId: 'member1',
    points: 100,
    idempotencyKey,
  });
  beforeEach(() => {
    ledger = new Ledger(new InMemoryLedgerStorage<undefined>());
  });

  it('accepts a key of 255 characters', async () => {
    await expect(
      ledger.earn(tx, input('k'.repeat(255))),
    ).resolves.toMatchObject({ duplicate: false });
  });

  it.each([
    ['empty', ''],
    ['longer than 255 characters', 'k'.repeat(256)],
  ])('earn rejects a key that is %s', async (_name, key) => {
    await expect(ledger.earn(tx, input(key))).rejects.toThrow(
      'Idempotency key must be 1-255 characters',
    );
  });

  it.each([
    ['empty', ''],
    ['longer than 255 characters', 'k'.repeat(256)],
  ])('spend rejects a key that is %s', async (_name, key) => {
    await expect(ledger.spend(tx, input(key))).rejects.toThrow(
      'Idempotency key must be 1-255 characters',
    );
  });
});
