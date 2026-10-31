import { MigrationInterface, QueryRunner } from 'typeorm';

// Tiers by 12-month spend in VND instead of points; old thresholds x 1000 (1 point per 1,000 VND of threshold).
export class TierMinSpend1793400000000 implements MigrationInterface {
  name = 'TierMinSpend1793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE tiers ADD COLUMN min_spend BIGINT UNSIGNED NULL AFTER name`,
    );
    await queryRunner.query(`UPDATE tiers SET min_spend = min_points * 1000`);
    await queryRunner.query(`
      ALTER TABLE tiers
        MODIFY min_spend BIGINT UNSIGNED NOT NULL,
        DROP COLUMN min_points,
        ADD CONSTRAINT uq_tiers_min_spend UNIQUE (min_spend)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE tiers ADD COLUMN min_points INT UNSIGNED NULL AFTER name`,
    );
    await queryRunner.query(
      `UPDATE tiers SET min_points = LEAST(min_spend DIV 1000, 4294967295)`,
    );
    await queryRunner.query(`
      ALTER TABLE tiers
        MODIFY min_points INT UNSIGNED NOT NULL,
        DROP INDEX uq_tiers_min_spend,
        DROP COLUMN min_spend
    `);
  }
}
