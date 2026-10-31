import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import { demoApiKey, seedDemo } from '../src/seed-demo';

describe('Demo seed', () => {
  let dataSource: DataSource;
  const apiKey = 'demo-key-demo-key-1234';

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
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM ledger_lots');
    await dataSource.query('DELETE FROM members');
    await dataSource.query('DELETE FROM tiers');
    await dataSource.query('DELETE FROM merchants');
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('creates the demo merchant, tiers and members', async () => {
    await seedDemo(dataSource, apiKey);

    const merchants = await dataSource.query(
      'SELECT id, api_key_hash FROM merchants',
    );
    expect(merchants).toHaveLength(1);
    expect(merchants[0].api_key_hash).toBe(
      createHash('sha256').update(apiKey).digest('hex'),
    );

    const members = await dataSource.query(
      `SELECT m.merchant_id, t.name AS tier FROM members m JOIN tiers t ON t.id = m.tier_id`,
    );
    expect(members.length).toBeGreaterThan(0);
    for (const member of members) {
      expect(Number(member.merchant_id)).toBe(Number(merchants[0].id));
      expect(member.tier).toBe('Bronze');
    }
  });

  it('can run twice without error or duplicates', async () => {
    await seedDemo(dataSource, apiKey);
    const first = await dataSource.query('SELECT COUNT(*) AS n FROM members');

    await seedDemo(dataSource, apiKey);

    const merchants = await dataSource.query(
      'SELECT COUNT(*) AS n FROM merchants',
    );
    const members = await dataSource.query('SELECT COUNT(*) AS n FROM members');
    expect(Number(merchants[0].n)).toBe(1);
    expect(Number(members[0].n)).toBe(Number(first[0].n));
  });
});

describe('demoApiKey', () => {
  const key = 'demo-key-demo-key-1234';

  it('returns the key from DEMO_API_KEY', () => {
    expect(demoApiKey({ DEMO_API_KEY: key }, [])).toBe(key);
  });

  it.each([
    ['missing', {}],
    ['empty', { DEMO_API_KEY: '' }],
    ['shorter than 16 characters', { DEMO_API_KEY: 'short' }],
  ])('rejects a DEMO_API_KEY that is %s', (_label, env) => {
    expect(() => demoApiKey(env, [])).toThrow('DEMO_API_KEY');
  });

  it('refuses to run in production without the flag', () => {
    expect(() =>
      demoApiKey({ DEMO_API_KEY: key, NODE_ENV: 'production' }, []),
    ).toThrow('--allow-production');
  });

  it('runs in production with the flag', () => {
    expect(
      demoApiKey({ DEMO_API_KEY: key, NODE_ENV: 'production' }, [
        '--allow-production',
      ]),
    ).toBe(key);
  });
});
