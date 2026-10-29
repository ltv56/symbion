import { Injectable } from '@nestjs/common';
import { EntityManager, QueryFailedError } from 'typeorm';
import {
  DuplicateKeyError,
  type LedgerStorage,
  type Lot,
} from '@symbion/ledger';

type LotRow = {
  id: string;
  merchant_id: string;
  member_id: string;
  points: number;
  remaining: number;
  expires_at: Date | null;
  idempotency_key: string;
  created_at: Date;
  type: 'earn' | 'spend';
  ref_type: string | null;
  ref_id: string | number | null;
};
function toSafeInt(value: unknown, field: string): number {
  const numberValue = Number(value);

  if (!Number.isSafeInteger(numberValue)) {
    throw new Error(`${field} is not a safe integer`);
  }

  return numberValue;
}

@Injectable()
export class MysqlLedgerStorage implements LedgerStorage<EntityManager> {
  private toLot(row: LotRow): Lot {
    return {
      id: String(toSafeInt(row.id, 'id')),
      merchantId: String(toSafeInt(row.merchant_id, 'merchant_id')),
      memberId: String(toSafeInt(row.member_id, 'member_id')),
      points: toSafeInt(row.points, 'points'),
      remaining: toSafeInt(row.remaining, 'remaining'),
      expiresAt: row.expires_at,
      idempotencyKey: String(row.idempotency_key),
      createdAt: row.created_at,
      type: row.type,
      ref:
        row.ref_type != null && row.ref_id != null
          ? {
              type: row.ref_type,
              id: String(toSafeInt(row.ref_id, 'ref_id')),
            }
          : null,
    };
  }

  async lockMember(tx: EntityManager, memberId: string): Promise<void> {
    // Row lock on the member serialises earn/spend for that member.
    const rows = await tx.query(
      `SELECT id FROM members WHERE id = ? FOR UPDATE`,
      [memberId],
    );
    if (rows.length === 0) {
      throw new Error(`Record not found: ${memberId}`);
    }
  }

  async insertLot(
    tx: EntityManager,
    lot: Omit<Lot, 'id' | 'createdAt'>,
  ): Promise<Lot> {
    let result: { insertId: number | string };
    try {
      result = await tx.query(
        `
        INSERT INTO ledger_lots (merchant_id, member_id, points, remaining, expires_at, idempotency_key, type, ref_type, ref_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lot.merchantId,
          lot.memberId,
          lot.points,
          lot.remaining,
          lot.expiresAt,
          lot.idempotencyKey,
          lot.type,
          lot.ref?.type ?? null,
          lot.ref?.id ?? null,
        ],
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
      ) {
        throw new DuplicateKeyError();
      }
      throw error;
    }

    const id = toSafeInt(result.insertId, 'insertId');
    const rows = await tx.query(`SELECT * FROM ledger_lots WHERE id = ?`, [id]);

    if (rows.length === 0) {
      throw new Error(`Could not find inserted lot with id ${id}`);
    }

    return this.toLot(rows[0]);
  }

  async findLotByKey(
    tx: EntityManager,
    merchantId: string,
    idempotencyKey: string,
  ): Promise<Lot | undefined> {
    // FOR UPDATE on purpose: a plain SELECT reads the REPEATABLE READ snapshot and may miss
    // the lot another transaction just committed, which is why the insert hit ER_DUP_ENTRY.
    const rows = await tx.query(
      `SELECT * FROM ledger_lots 
      WHERE merchant_id = ? AND idempotency_key = ? 
      FOR UPDATE`,
      [merchantId, idempotencyKey],
    );
    if (rows.length === 0) {
      return undefined;
    }

    return this.toLot(rows[0]);
  }

  async sumRemaining(
    tx: EntityManager,
    memberId: string,
    now: Date,
  ): Promise<number> {
    const rows = await tx.query(
      `SELECT COALESCE(SUM(remaining), 0) AS total
      FROM ledger_lots
      WHERE member_id = ?
      AND (expires_at IS NULL OR expires_at > ?);`,
      [memberId, now],
    );
    return toSafeInt(rows[0].total, 'total');
  }

  async findSpendableLots(
    tx: EntityManager,
    memberId: string,
    now: Date,
  ): Promise<Lot[]> {
    // FIFO: lots that expire first, lots without expiry last, lower id first on a tie.
    const rows: LotRow[] = await tx.query(
      `SELECT *
      FROM ledger_lots
      WHERE member_id = ?
      AND remaining > 0
      AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY expires_at IS NULL, expires_at, id
      FOR UPDATE`,
      [memberId, now],
    );
    return rows.map((row: LotRow) => this.toLot(row));
  }

  async setRemaining(
    tx: EntityManager,
    lotId: string,
    remaining: number,
  ): Promise<void> {
    const result: { affectedRows: number } = await tx.query(
      `UPDATE ledger_lots SET remaining = ? WHERE id = ?`,
      [remaining, lotId],
    );
    if (result.affectedRows === 0) {
      throw new Error(`Lot with id ${lotId} not found`);
    }
  }

  async findDebtLots(tx: EntityManager, memberId: string): Promise<Lot[]> {
    const rows: LotRow[] = await tx.query(
      `SELECT *
      FROM ledger_lots
      WHERE member_id = ?
      AND remaining < 0 ORDER BY id FOR UPDATE`,
      [memberId],
    );
    return rows.map((row: LotRow) => this.toLot(row));
  }
}
