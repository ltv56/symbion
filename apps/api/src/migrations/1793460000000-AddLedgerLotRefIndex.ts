import { MigrationInterface, QueryRunner } from 'typeorm';

// Refunds look up the earn lot of an order by (ref_type, ref_id).
export class AddLedgerLotRefIndex1793460000000 implements MigrationInterface {
  name = 'AddLedgerLotRefIndex1793460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ledger_lots ADD INDEX idx_ledger_lots_ref (ref_type, ref_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ledger_lots DROP INDEX idx_ledger_lots_ref
    `);
  }
}
