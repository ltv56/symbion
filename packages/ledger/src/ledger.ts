import type { LedgerStorage } from './storage';
import type { EarnInput, EarnResult, SpendInput, SpendResult } from './types';
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

  // Check the total before changing any lot: in-memory has no rollback, so a half spend would stay.
  async spend(tx: Tx, input: SpendInput): Promise<SpendResult> {
    if (!Number.isInteger(input.points) || input.points <= 0) {
      throw new Error('Points must be a positive integer');
    }

    const lots = await this.storage.findSpendableLots(
      tx,
      input.memberId,
      input.now,
    );

    // Narrow case first: with no lots the total is 0 and would hit the broader check below.
    if (lots.length === 0) {
      throw new Error(
        `Not enough points to spend: requested ${input.points}, no available lots`,
      );
    }

    const totalRemaining = lots.reduce((sum, lot) => sum + lot.remaining, 0);
    if (totalRemaining < input.points) {
      throw new Error(
        `Not enough points to spend: requested ${input.points}, available ${totalRemaining}`,
      );
    }

    let left = input.points;
    const consumed: { lotId: string; points: number }[] = [];
    for (const lot of lots) {
      if (left <= 0) {
        break;
      }
      const take = Math.min(lot.remaining, left);
      await this.storage.setRemaining(tx, lot.id, lot.remaining - take);
      consumed.push({ lotId: lot.id, points: take });
      left -= take;
    }

    return { consumed };
  }

  balance(tx: Tx, memberId: string, now: Date): Promise<number> {
    return this.storage.sumRemaining(tx, memberId, now);
  }
}
