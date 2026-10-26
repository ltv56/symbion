import { MigrationInterface, QueryRunner } from 'typeorm';

// The unique key is the last line of defence against duplicate orders;
// it includes merchant_id so two merchants may reuse the same key.
export class CreateOrders1793028692880 implements MigrationInterface {
  name = 'CreateOrders1793028692880';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE orders (
        id BIGINT UNSIGNED AUTO_INCREMENT,
        merchant_id BIGINT UNSIGNED NOT NULL,
        member_id BIGINT UNSIGNED NOT NULL,
        idempotency_key VARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT uq_orders_merchant_idempotency_key UNIQUE (merchant_id, idempotency_key),
        CONSTRAINT fk_orders_merchant_id FOREIGN KEY (merchant_id) REFERENCES merchants(id),
        CONSTRAINT fk_orders_member_id FOREIGN KEY (member_id) REFERENCES members(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS orders`);
  }
}
