import { MigrationInterface, QueryRunner } from 'typeorm';

// One live code per member: a new request replaces the row.
export class CreateMemberOtps1793390000000 implements MigrationInterface {
  name = 'CreateMemberOtps1793390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE member_otps (
        member_id BIGINT UNSIGNED NOT NULL,
        code_hash CHAR(64) CHARACTER SET ascii NOT NULL,
        attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (member_id),
        CONSTRAINT fk_member_otps_member_id FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS member_otps`);
  }
}
