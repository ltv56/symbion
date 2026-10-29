import { MigrationInterface, QueryRunner } from 'typeorm';

// expires_at keeps milliseconds; the key uses a NO PAD binary collation so 'a' and 'a ' are different keys.
// The unique key is the last line of defence for a repeated earn/spend; BIGINT because points can pass the INT range.
// points and remaining are signed: spend entries and debt lots are negative.
export class CreateLedgerLots1793201263201 implements MigrationInterface {
  name = 'CreateLedgerLots1793201263201';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ledger_lots (
        id BIGINT UNSIGNED AUTO_INCREMENT,
        merchant_id BIGINT UNSIGNED NOT NULL,
        member_id BIGINT UNSIGNED NOT NULL,
        points BIGINT NOT NULL,
        remaining BIGINT NOT NULL,
        expires_at DATETIME(3) NULL,
        idempotency_key VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT uq_ledger_lots_merchant_idempotency_key UNIQUE (merchant_id, idempotency_key),
        CONSTRAINT chk_ledger_lots_points_nonzero CHECK (points <> 0),
        CONSTRAINT fk_ledger_lots_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id),
        CONSTRAINT fk_ledger_lots_member FOREIGN KEY (member_id) REFERENCES members(id),
        INDEX idx_ledger_lots_member_expires (member_id, expires_at, id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ledger_lots`);
  }
}
