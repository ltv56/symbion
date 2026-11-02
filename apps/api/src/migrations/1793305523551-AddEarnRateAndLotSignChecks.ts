import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEarnRateAndLotSignChecks1793305523551 implements MigrationInterface {
  name = 'AddEarnRateAndLotSignChecks1793305523551';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(/* sql */ `
      ALTER TABLE tiers
        ADD CONSTRAINT chk_tiers_earn_rate CHECK (earn_rate >= 0)
      `);
    await queryRunner.query(/* sql */ `
      ALTER TABLE ledger_lots
        ADD CONSTRAINT chk_ledger_lots_type_points CHECK ((type = 'earn') = (points > 0))
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(/* sql */ `
      ALTER TABLE ledger_lots
        DROP CHECK chk_ledger_lots_type_points
      `);
    await queryRunner.query(/* sql */ `
      ALTER TABLE tiers
        DROP CHECK chk_tiers_earn_rate
      `);
  }
}
