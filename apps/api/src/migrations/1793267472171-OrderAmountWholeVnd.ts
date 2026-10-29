import { MigrationInterface, QueryRunner } from 'typeorm';

// VND has no minor unit, so amounts are whole numbers. Existing rows with cents are rounded.
export class OrderAmountWholeVnd1793267472171 implements MigrationInterface {
  name = 'OrderAmountWholeVnd1793267472171';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders MODIFY amount BIGINT UNSIGNED NOT NULL
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders MODIFY amount DECIMAL(12,2) NOT NULL
      `);
  }
}
