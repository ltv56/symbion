import { MigrationInterface, QueryRunner } from 'typeorm';

// Add type nullable, backfill, then NOT NULL: existing rows would get '' and fail the CHECK.
export class AddLedgerLotTypeRef1793279708034 implements MigrationInterface {
  name = 'AddLedgerLotTypeRef1793279708034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(/* sql */ `
      ALTER TABLE ledger_lots
        ADD COLUMN type VARCHAR(16) NULL,
        ADD COLUMN ref_type VARCHAR(32) NULL,
        ADD COLUMN ref_id BIGINT UNSIGNED NULL
      `);
    await queryRunner.query(/* sql */ `
      UPDATE ledger_lots SET type = IF(points > 0, 'earn', 'spend')
      `);
    await queryRunner.query(/* sql */ `
      ALTER TABLE ledger_lots MODIFY type VARCHAR(16) NOT NULL
      `);
    await queryRunner.query(/* sql */ `
      ALTER TABLE ledger_lots
        ADD CONSTRAINT chk_ledger_lots_type CHECK (type IN ('earn', 'spend'))
      `);
    await queryRunner.query(/* sql */ `
      ALTER TABLE ledger_lots
        ADD CONSTRAINT chk_ledger_lots_ref CHECK ((ref_type IS NULL) = (ref_id IS NULL))
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(/* sql */ `
      ALTER TABLE ledger_lots
        DROP CHECK chk_ledger_lots_ref,
        DROP CHECK chk_ledger_lots_type
      `);
    await queryRunner.query(/* sql */ `
      ALTER TABLE ledger_lots
        DROP COLUMN ref_id,
        DROP COLUMN ref_type,
        DROP COLUMN type
      `);
  }
}
