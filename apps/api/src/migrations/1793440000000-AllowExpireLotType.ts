import { MigrationInterface, QueryRunner } from 'typeorm';

// chk_ledger_lots_type_points already fits: an expire entry has negative points.
export class AllowExpireLotType1793440000000 implements MigrationInterface {
  name = 'AllowExpireLotType1793440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(/* sql */ `
      ALTER TABLE ledger_lots
        DROP CHECK chk_ledger_lots_type,
        ADD CONSTRAINT chk_ledger_lots_type CHECK (type IN ('earn', 'spend', 'expire'))
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(/* sql */ `
      DELETE FROM ledger_lots WHERE type = 'expire'
      `);
    await queryRunner.query(/* sql */ `
      ALTER TABLE ledger_lots
        DROP CHECK chk_ledger_lots_type,
        ADD CONSTRAINT chk_ledger_lots_type CHECK (type IN ('earn', 'spend'))
      `);
  }
}
