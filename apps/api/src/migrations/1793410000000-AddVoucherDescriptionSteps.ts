import { MigrationInterface, QueryRunner } from 'typeorm';

// steps is a JSON array of strings; the length and item rules live in the DTO.
export class AddVoucherDescriptionSteps1793410000000 implements MigrationInterface {
  name = 'AddVoucherDescriptionSteps1793410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
        ADD COLUMN description TEXT NULL AFTER title,
        ADD COLUMN steps JSON NULL AFTER description,
        ADD CONSTRAINT chk_vouchers_steps CHECK (steps IS NULL OR JSON_TYPE(steps) = 'ARRAY')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
        DROP CHECK chk_vouchers_steps,
        DROP COLUMN steps,
        DROP COLUMN description
    `);
  }
}
