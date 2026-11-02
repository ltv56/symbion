import { MigrationInterface, QueryRunner } from 'typeorm';

// merchant_id is the voucher's merchant, not the caller's.
// point_value_vnd is the value at redemption time, so settlement doesn't move when it changes.
export class CreateRedemptions1793350000000 implements MigrationInterface {
  name = 'CreateRedemptions1793350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE redemptions (
        id BIGINT UNSIGNED AUTO_INCREMENT,
        merchant_id BIGINT UNSIGNED NOT NULL,
        member_id BIGINT UNSIGNED NOT NULL,
        voucher_id BIGINT UNSIGNED NOT NULL,
        code VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        points BIGINT UNSIGNED NOT NULL,
        point_value_vnd INT UNSIGNED NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'issued',
        client_key VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT uq_redemptions_code UNIQUE (code),
        CONSTRAINT uq_redemptions_member_client_key UNIQUE (member_id, client_key),
        CONSTRAINT fk_redemptions_merchant_id FOREIGN KEY (merchant_id) REFERENCES merchants(id),
        CONSTRAINT fk_redemptions_member_id FOREIGN KEY (member_id) REFERENCES members(id),
        CONSTRAINT fk_redemptions_voucher_id FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
        CONSTRAINT chk_redemptions_points CHECK (points > 0),
        CONSTRAINT chk_redemptions_point_value CHECK (point_value_vnd > 0),
        CONSTRAINT chk_redemptions_status CHECK (status IN ('issued'))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS redemptions`);
  }
}
