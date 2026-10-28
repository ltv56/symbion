import type { Lot } from './types';
import { DuplicateKeyError, type LedgerStorage } from './storage';

// For tests only: it ignores the tx. Check + set has no await between, so a duplicate can't slip in.
export class InMemoryLedgerStorage<Tx> implements LedgerStorage<Tx> {
  private readonly lots = new Map<string, Lot>();
  private nextId = 1;

  async insertLot(_tx: Tx, input: Omit<Lot, 'id' | 'createdAt'>): Promise<Lot> {
    const key = this.key(input.merchantId, input.idempotencyKey);

    if (this.lots.has(key)) {
      throw new DuplicateKeyError();
    }

    const lot: Lot = {
      ...input,
      id: String(this.nextId++),
      createdAt: new Date(),
    };

    this.lots.set(key, this.copy(lot));
    return lot;
  }

  async findLotByKey(
    _tx: Tx,
    merchantId: Lot['merchantId'],
    idempotencyKey: Lot['idempotencyKey'],
  ): Promise<Lot | undefined> {
    const lot = this.lots.get(this.key(merchantId, idempotencyKey));
    return lot && this.copy(lot);
  }

  async sumRemaining(
    _tx: Tx,
    memberId: Lot['memberId'],
    now: Date,
  ): Promise<number> {
    return [...this.lots.values()]
      .filter((lot) => lot.memberId === memberId)
      .filter((lot) => !lot.expiresAt || lot.expiresAt > now)
      .reduce((sum, lot) => sum + lot.remaining, 0);
  }

  async findSpendableLots(
    _tx: Tx,
    memberId: Lot['memberId'],
    now: Date,
  ): Promise<Lot[]> {
    // ids compare as numbers in the sort: as strings "10" < "9".
    return [...this.lots.values()]
      .filter((lot) => lot.memberId === memberId)
      .filter((lot) => lot.remaining > 0)
      .filter((lot) => !lot.expiresAt || lot.expiresAt > now)
      .sort((a, b) => {
        if (a.expiresAt === null && b.expiresAt === null) {
          return Number(a.id) - Number(b.id);
        }
        if (a.expiresAt === null) {
          return 1;
        }
        if (b.expiresAt === null) {
          return -1;
        }
        const expiresDiff = a.expiresAt.getTime() - b.expiresAt.getTime();
        if (expiresDiff !== 0) {
          return expiresDiff;
        }
        return Number(a.id) - Number(b.id);
      })
      .map((lot) => this.copy(lot));
  }

  async findDebtLots(_tx: Tx, memberId: Lot['memberId']): Promise<Lot[]> {
    return [...this.lots.values()]
      .filter((lot) => lot.memberId === memberId)
      .filter((lot) => lot.remaining < 0)
      .map((lot) => this.copy(lot));
  }

  // Lots are keyed by idempotency key, so look the lot up by id.
  async setRemaining(_tx: Tx, lotId: string, remaining: number): Promise<void> {
    const lot = [...this.lots.values()].find((lot) => lot.id === lotId);
    if (!lot) {
      throw new Error(`Lot with id ${lotId} not found`);
    }
    lot.remaining = remaining;
  }

  // Copies in and out so a caller can't change stored lots (like a DB row would be).
  private copy(lot: Lot): Lot {
    return {
      ...lot,
      expiresAt: lot.expiresAt && new Date(lot.expiresAt),
      createdAt: new Date(lot.createdAt),
    };
  }

  private key(
    merchantId: Lot['merchantId'],
    idempotencyKey: Lot['idempotencyKey'],
  ): string {
    // JSON keeps ("1:2", "3") and ("1", "2:3") apart; a plain ":" join would not.
    return JSON.stringify([merchantId, idempotencyKey]);
  }
}
