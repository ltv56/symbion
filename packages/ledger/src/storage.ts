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
  sumRemaining(tx: Tx, memberId: string, now: Date): Promise<number>;
  // Not expired, remaining > 0. Order: expiresAt asc (null last), then id.
  // The MySQL adapter must use a locking read (FOR UPDATE) so parallel spends can't double spend.
  findSpendableLots(tx: Tx, memberId: string, now: Date): Promise<Lot[]>;
  setRemaining(tx: Tx, lotId: string, remaining: number): Promise<void>;
  // Debt lots: remaining < 0, oldest first (id asc), because earn pays the oldest debt first. Expiry does not apply to debt.
  // The MySQL adapter must also use a locking read (FOR UPDATE), so two parallel spends can't pay the same debt twice.
  findDebtLots(tx: Tx, memberId: string): Promise<Lot[]>;
};
