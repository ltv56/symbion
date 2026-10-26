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

  async sumRemaining(_tx: Tx, memberId: Lot['memberId']): Promise<number> {
    return [...this.lots.values()]
      .filter((lot) => lot.memberId === memberId)
      .reduce((sum, lot) => sum + lot.remaining, 0);
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
