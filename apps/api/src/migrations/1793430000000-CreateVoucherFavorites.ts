import { MigrationInterface, QueryRunner } from 'typeorm';

// merchant_id is the voucher's merchant, not the member's.
// The primary key is the unique constraint: two parallel PUTs cannot add a second row.
export class CreateVoucherFavorites1793430000000 implements MigrationInterface {
  name = 'CreateVoucherFavorites1793430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE voucher_favorites (
        member_id BIGINT UNSIGNED NOT NULL,
        voucher_id BIGINT UNSIGNED NOT NULL,
        merchant_id BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (member_id, voucher_id),
        CONSTRAINT fk_voucher_favorites_member_id FOREIGN KEY (member_id) REFERENCES members(id),
        CONSTRAINT fk_voucher_favorites_voucher_id FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
        CONSTRAINT fk_voucher_favorites_merchant_id FOREIGN KEY (merchant_id) REFERENCES merchants(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS voucher_favorites`);
  }
}
