import { MigrationInterface, QueryRunner } from 'typeorm';

export class CaseSensitiveIdempotencyKey1793032861533 implements MigrationInterface {
  name = 'CaseSensitiveIdempotencyKey1793032861533';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Keys are opaque: _bin so 'Order-1' and 'order-1' don't collide in the unique index.
    await queryRunner.query(`
      ALTER TABLE orders
      MODIFY idempotency_key VARCHAR(255)
      CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
      NOT NULL
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      MODIFY idempotency_key VARCHAR(255) NOT NULL
      `);
  }
}
