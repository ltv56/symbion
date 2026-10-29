import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderRequestHash1793306729284 implements MigrationInterface {
  name = 'AddOrderRequestHash1793306729284';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(/* sql */ `
      ALTER TABLE orders
        ADD COLUMN request_hash CHAR(64) NULL AFTER amount
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(/* sql */ `
      ALTER TABLE orders
        DROP COLUMN request_hash
      `);
  }
}
