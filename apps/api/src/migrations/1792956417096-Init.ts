import { MigrationInterface, QueryRunner } from 'typeorm';

// Tiers are global (managed by app admin, no merchant_id).
// Member email is UNIQUE across the programme because points are shared.
// members.merchant_id is the merchant where the member signed up.
export class Init1792956417096 implements MigrationInterface {
  name = 'Init1792956417096';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE merchants (
        id BIGINT UNSIGNED AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        api_key_hash CHAR(64) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT uq_merchants_api_key_hash UNIQUE (api_key_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE tiers (
        id BIGINT UNSIGNED AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        min_points INT UNSIGNED NOT NULL,
        earn_rate DECIMAL(5,2) NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT uq_tiers_name UNIQUE (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE members (
        id BIGINT UNSIGNED AUTO_INCREMENT,
        merchant_id BIGINT UNSIGNED NOT NULL,
        tier_id BIGINT UNSIGNED NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT uq_members_email UNIQUE (email),
        CONSTRAINT fk_members_merchant_id FOREIGN KEY (merchant_id) REFERENCES merchants(id),
        CONSTRAINT fk_members_tier_id FOREIGN KEY (tier_id) REFERENCES tiers(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS members`);
    await queryRunner.query(`DROP TABLE IF EXISTS tiers`);
    await queryRunner.query(`DROP TABLE IF EXISTS merchants`);
  }
}
