import { MigrationInterface, QueryRunner } from 'typeorm';

// No members row until the code is confirmed. The email is the key: a new request replaces the old code.
export class CreateMemberSignups1793450000000 implements MigrationInterface {
  name = 'CreateMemberSignups1793450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE member_signups (
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        attempts INT UNSIGNED NOT NULL DEFAULT 0,
        expires_at TIMESTAMP(3) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS member_signups`);
  }
}
