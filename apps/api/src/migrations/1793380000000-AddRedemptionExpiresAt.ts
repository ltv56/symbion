import { MigrationInterface, QueryRunner } from 'typeorm';

// expires_at = min(created_at + 30 days, voucher valid_until), set at redemption.
// 'expired' is derived on read, never stored.
export class AddRedemptionExpiresAt1793380000000 implements MigrationInterface {
  name = 'AddRedemptionExpiresAt1793380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE redemptions ADD COLUMN expires_at TIMESTAMP NULL AFTER used_at
    `);
    await queryRunner.query(`
      UPDATE redemptions r JOIN vouchers v ON v.id = r.voucher_id
      SET r.expires_at = LEAST(r.created_at + INTERVAL 30 DAY, v.valid_until)
    `);
    await queryRunner.query(`
      ALTER TABLE redemptions MODIFY expires_at TIMESTAMP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE redemptions DROP COLUMN expires_at`);
  }
}
