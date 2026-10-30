import { DataSource } from 'typeorm';
import { seedTiers } from '../src/seed';

describe('Seed', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    await dataSource.initialize();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM refunds');
    await dataSource.query('DELETE FROM redemptions');
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM ledger_lots');
    await dataSource.query('DELETE FROM members');
    await dataSource.query('DELETE FROM tiers');
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('inserts the default tiers once, even when run twice', async () => {
    await seedTiers(dataSource);
    await seedTiers(dataSource);

    const rows = await dataSource.query(
      'SELECT name, min_points, earn_rate FROM tiers ORDER BY min_points',
    );
    expect(rows.map((r: { name: string }) => r.name)).toEqual([
      'Bronze',
      'Silver',
      'Gold',
    ]);
  });

  it('resets a tier that was edited back to the seed values', async () => {
    await seedTiers(dataSource);
    await dataSource.query(
      `UPDATE tiers SET earn_rate = 9.99 WHERE name = 'Bronze'`,
    );

    await seedTiers(dataSource);

    const [bronze] = await dataSource.query(
      `SELECT earn_rate FROM tiers WHERE name = 'Bronze'`,
    );
    expect(Number(bronze.earn_rate)).toBe(1);
  });

  it('refuses to seed when another tier already has a default threshold', async () => {
    await dataSource.query(
      `INSERT INTO tiers (name, min_points, earn_rate) VALUES ('Basic', 0, 2)`,
    );

    await expect(seedTiers(dataSource)).rejects.toThrow(/min_points 0/);

    const rows = await dataSource.query('SELECT name FROM tiers');
    expect(rows.map((r: { name: string }) => r.name)).toEqual(['Basic']);
  });
});
