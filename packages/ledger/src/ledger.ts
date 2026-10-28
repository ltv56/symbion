import type { LedgerStorage } from './storage';
import type {
  EarnInput,
  EarnResult,
  Lot,
  SpendInput,
  SpendResult,
} from './types';
import { DuplicateKeyError } from './storage';

export class Ledger<Tx> {
  constructor(private readonly storage: LedgerStorage<Tx>) {}

  // Old debt is paid first, so the member never has a debt lot and a positive lot at the same time
  // (spend drains the positive lots before it creates debt).
  // Insert first, then catch the duplicate. A check-then-insert would race.
  // The debt lots are written only after a successful insert, so a retry can't pay the debt twice.
  async earn(tx: Tx, input: EarnInput): Promise<EarnResult> {
    if (!Number.isSafeInteger(input.points) || input.points <= 0) {
      throw new Error('Points must be a positive integer');
    }

    const debtLots = await this.storage.findDebtLots(tx, input.memberId);
    const oldDebt = debtLots.reduce((sum, lot) => sum - lot.remaining, 0);
    // A lot that is already expired is worth nothing, so it must not pay debt (balance ignores it).
    const { now, ...lotFields } = input;
    const alreadyExpired = !!input.expiresAt && input.expiresAt <= now;
    const pay = alreadyExpired ? 0 : Math.min(input.points, oldDebt);

    const lotToInsert = {
      ...lotFields,
      remaining: input.points - pay,
      expiresAt: input.expiresAt ?? null,
    };

    let insertedLot: Lot;
    try {
      insertedLot = await this.storage.insertLot(tx, lotToInsert);
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

    let payLeft = pay;
    for (const debtLot of debtLots) {
      if (payLeft <= 0) {
        break;
      }
      const taken = Math.min(-debtLot.remaining, payLeft);
      await this.storage.setRemaining(
        tx,
        debtLot.id,
        debtLot.remaining + taken,
      );
      payLeft -= taken;
    }

    return { lot: insertedLot, duplicate: false };
  }

  async spend(tx: Tx, input: SpendInput): Promise<SpendResult> {
    if (!Number.isSafeInteger(input.points) || input.points <= 0) {
      throw new Error('Points must be a positive integer');
    }

    const lots = await this.storage.findSpendableLots(
      tx,
      input.memberId,
      input.now,
    );

    const available = lots.reduce((sum, lot) => sum + lot.remaining, 0);
    const shortfall = Math.max(0, input.points - available);

    // Every spend writes one entry, so its key is recorded even when the lots cover it.
    // `points` is minus what was spent, `remaining` is minus the shortfall (0 when covered).
    // Insert first: if the key is a duplicate nothing else was changed yet.
    await this.storage.insertLot(tx, {
      merchantId: input.merchantId,
      memberId: input.memberId,
      points: -input.points,
      remaining: -shortfall,
      expiresAt: null,
      idempotencyKey: input.idempotencyKey,
    });

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

    return { consumed, debt: shortfall };
  }

  balance(tx: Tx, memberId: string, now: Date): Promise<number> {
    return this.storage.sumRemaining(tx, memberId, now);
  }
}
