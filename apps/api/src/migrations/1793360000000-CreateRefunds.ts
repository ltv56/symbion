import { MigrationInterface, QueryRunner } from 'typeorm';

// merchant_id is the order's merchant.
export class CreateRefunds1793360000000 implements MigrationInterface {
  name = 'CreateRefunds1793360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE refunds (
        id BIGINT UNSIGNED AUTO_INCREMENT,
        merchant_id BIGINT UNSIGNED NOT NULL,
        order_id BIGINT UNSIGNED NOT NULL,
        idempotency_key VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        amount BIGINT UNSIGNED NOT NULL,
        points_deducted BIGINT UNSIGNED NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT uq_refunds_merchant_idempotency_key UNIQUE (merchant_id, idempotency_key),
        CONSTRAINT fk_refunds_merchant_id FOREIGN KEY (merchant_id) REFERENCES merchants(id),
        CONSTRAINT fk_refunds_order_id FOREIGN KEY (order_id) REFERENCES orders(id),
        CONSTRAINT chk_refunds_amount CHECK (amount > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refunds`);
  }
}
