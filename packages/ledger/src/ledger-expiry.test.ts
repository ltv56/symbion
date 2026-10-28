import { Ledger } from './ledger';
import { InMemoryLedgerStorage } from './in-memory-storage';

describe('balance with expiry', () => {
  let ledger: Ledger<undefined>;
  const tx = undefined;
  const now = new Date('2026-01-10T00:00:00Z');
  const oneDayMs = 24 * 60 * 60 * 1000;
  beforeEach(() => {
    ledger = new Ledger(new InMemoryLedgerStorage<undefined>());
  });

  it('counts a lot whose expiresAt is in the future', async () => {
    const future = new Date(now.getTime() + oneDayMs);
    await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: future,
    });

    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(100);
  });

  it('ignores a lot whose expiresAt is in the past', async () => {
    const past = new Date(now.getTime() - oneDayMs);
    await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: past,
    });

    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(0);
  });

  it('treats expiresAt === now as expired', async () => {
    const atNow = new Date(now.getTime());
    await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: atNow,
    });

    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(0);
  });

  it('never expires a lot with expiresAt null', async () => {
    await ledger.earn(tx, {
      now,
      merchantId: 'merchant1',
      memberId: 'member1',
      points: 100,
      idempotencyKey: 'key1',
      expiresAt: null,
    });

    await expect(ledger.balance(tx, 'member1', now)).resolves.toBe(100);
  });
});
