import { MigrationInterface, QueryRunner } from 'typeorm';

// program_settings holds one row. The voucher floor (face_value >= points_price x point value)
// is checked in the service: a CHECK cannot read another table.
export class CreateVouchersAndSettings1793310200195 implements MigrationInterface {
  name = 'CreateVouchersAndSettings1793310200195';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE program_settings (
        id TINYINT UNSIGNED NOT NULL,
        point_value_vnd INT UNSIGNED NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT chk_program_settings_single_row CHECK (id = 1),
        CONSTRAINT chk_program_settings_point_value CHECK (point_value_vnd > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await queryRunner.query(`
      INSERT INTO program_settings (id, point_value_vnd) VALUES (1, 100)
    `);

    await queryRunner.query(`
      CREATE TABLE vouchers (
        id BIGINT UNSIGNED AUTO_INCREMENT,
        merchant_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        face_value BIGINT UNSIGNED NOT NULL,
        points_price BIGINT UNSIGNED NOT NULL,
        stock INT UNSIGNED NOT NULL,
        valid_until TIMESTAMP NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_vouchers_merchant_id FOREIGN KEY (merchant_id) REFERENCES merchants(id),
        CONSTRAINT chk_vouchers_face_value CHECK (face_value > 0),
        CONSTRAINT chk_vouchers_points_price CHECK (points_price > 0),
        CONSTRAINT chk_vouchers_status CHECK (status IN ('active', 'expired')),
        INDEX idx_vouchers_status_id (status, id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS vouchers`);
    await queryRunner.query(`DROP TABLE IF EXISTS program_settings`);
  }
}
