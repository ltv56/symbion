import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMerchantPhotoAddress1793420000000 implements MigrationInterface {
  name = 'AddMerchantPhotoAddress1793420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE merchants
        ADD COLUMN photo_url VARCHAR(2048) NULL AFTER name,
        ADD COLUMN address VARCHAR(255) NULL AFTER photo_url
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE merchants
        DROP COLUMN address,
        DROP COLUMN photo_url
    `);
  }
}
