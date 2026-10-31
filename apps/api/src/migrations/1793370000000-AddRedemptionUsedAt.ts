import { MigrationInterface, QueryRunner } from 'typeorm';

// used_at is set exactly when status is 'used'.
export class AddRedemptionUsedAt1793370000000 implements MigrationInterface {
  name = 'AddRedemptionUsedAt1793370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE redemptions
        ADD COLUMN used_at TIMESTAMP NULL AFTER client_key,
        DROP CHECK chk_redemptions_status,
        ADD CONSTRAINT chk_redemptions_status CHECK (status IN ('issued', 'used')),
        ADD CONSTRAINT chk_redemptions_used_at CHECK ((status = 'used') = (used_at IS NOT NULL))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE redemptions
        DROP CHECK chk_redemptions_used_at,
        DROP CHECK chk_redemptions_status,
        DROP COLUMN used_at,
        ADD CONSTRAINT chk_redemptions_status CHECK (status IN ('issued'))
    `);
  }
}
