import type { LedgerStorage } from './storage';
import type { EarnInput, EarnResult } from './types';
import { DuplicateKeyError } from './storage';

export class Ledger<Tx> {
  constructor(private readonly storage: LedgerStorage<Tx>) {}

  // Insert first, then catch the duplicate. A check-then-insert would race.
  async earn(tx: Tx, input: EarnInput): Promise<EarnResult> {
    if (!Number.isInteger(input.points) || input.points <= 0) {
      throw new Error('Points must be a positive integer');
    }

    const lotToInsert = {
      ...input,
      remaining: input.points,
      expiresAt: input.expiresAt ?? null,
    };

    try {
      const insertedLot = await this.storage.insertLot(tx, lotToInsert);
      return { lot: insertedLot, duplicate: false };
    } catch (error) {
      if (!(error instanceof DuplicateKeyError)) {
        throw error;
      }

      const existingLot = await this.storage.findLotByKey(
        tx,
        input.merchantId,
        input.idempotencyKey,
      );

      // With MySQL REPEATABLE READ a plain SELECT may not see a lot committed after our snapshot.
      if (!existingLot) {
        throw new Error(
          `Duplicate lot key was reported, but no existing lot was found ` +
            `(merchantId=${input.merchantId}, idempotencyKey=${input.idempotencyKey})`,
        );
      }
      return { lot: existingLot, duplicate: true };
    }
  }

  balance(tx: Tx, memberId: string, now: Date): Promise<number> {
    return this.storage.sumRemaining(tx, memberId, now);
  }
}
