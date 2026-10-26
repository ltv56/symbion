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

    this.lots.set(key, lot);
    return lot;
  }

  async findLotByKey(
    _tx: Tx,
    merchantId: Lot['merchantId'],
    idempotencyKey: Lot['idempotencyKey'],
  ): Promise<Lot | undefined> {
    return this.lots.get(this.key(merchantId, idempotencyKey));
  }

  async sumRemaining(_tx: Tx, memberId: Lot['memberId']): Promise<number> {
    return [...this.lots.values()]
      .filter((lot) => lot.memberId === memberId)
      .reduce((sum, lot) => sum + lot.remaining, 0);
  }

  private key(
    merchantId: Lot['merchantId'],
    idempotencyKey: Lot['idempotencyKey'],
  ): string {
    // JSON keeps ("1:2", "3") and ("1", "2:3") apart; a plain ":" join would not.
    return JSON.stringify([merchantId, idempotencyKey]);
  }
}
