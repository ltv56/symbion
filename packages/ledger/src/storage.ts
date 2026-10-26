import type { Lot } from './types';

// Thrown when (merchantId, idempotencyKey) already exists. Mirrors the UNIQUE constraint in MySQL.
export class DuplicateKeyError extends Error {
  constructor(message = 'Duplicate lot error') {
    super(message);
    this.name = 'DuplicateKeyError';
  }
}

// Tx is the caller's transaction. The ledger never opens one, so every method takes it first.
// The storage creates id and createdAt (MySQL auto increment / default later).
export type LedgerStorage<Tx> = {
  insertLot(tx: Tx, lot: Omit<Lot, 'id' | 'createdAt'>): Promise<Lot>;
  findLotByKey(
    tx: Tx,
    merchantId: string,
    idempotencyKey: string,
  ): Promise<Lot | undefined>;
  sumRemaining(tx: Tx, memberId: string): Promise<number>;
};
