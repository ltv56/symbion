import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import dataSource from './data-source';
import { seedTiers } from './seed';

const MIN_KEY_LENGTH = 16;
const DEMO_MERCHANT = 'Demo Shop';
const DEMO_MEMBERS = [
  { name: 'Demo Member One', email: 'member1@demo.example' },
  { name: 'Demo Member Two', email: 'member2@demo.example' },
  { name: 'Demo Member Three', email: 'member3@demo.example' },
];

export function demoApiKey(env: NodeJS.ProcessEnv, argv: string[]): string {
  const key = env.DEMO_API_KEY;
  if (!key || key.length < MIN_KEY_LENGTH) {
    throw new Error(
      `DEMO_API_KEY is required and must be at least ${MIN_KEY_LENGTH} characters`,
    );
  }
  if (env.NODE_ENV === 'production' && !argv.includes('--allow-production')) {
    throw new Error(
      'Refusing to seed demo data in production without --allow-production',
    );
  }
  return key;
}

// Safe to run twice: the merchant is matched by api key hash, members by email.
export async function seedDemo(ds: DataSource, apiKey: string): Promise<void> {
  await seedTiers(ds);

  const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');
  await ds.query(
    `INSERT INTO merchants (name, api_key_hash) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [DEMO_MERCHANT, apiKeyHash],
  );
  const [merchant] = await ds.query(
    'SELECT id FROM merchants WHERE api_key_hash = ?',
    [apiKeyHash],
  );
  const [tier] = await ds.query(
    'SELECT id FROM tiers ORDER BY min_points ASC LIMIT 1',
  );

  for (const member of DEMO_MEMBERS) {
    await ds.query(
      `INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [merchant.id, tier.id, member.email, member.name],
    );
  }
}

async function main(): Promise<void> {
  const apiKey = demoApiKey(process.env, process.argv.slice(2));
  await dataSource.initialize();
  try {
    await seedDemo(dataSource, apiKey);
    console.log(
      `Seeded merchant "${DEMO_MERCHANT}" and ${DEMO_MEMBERS.length} members`,
    );
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
