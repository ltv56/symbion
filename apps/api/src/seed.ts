import { DataSource } from 'typeorm';
import dataSource from './data-source';

const TIERS = [
  { name: 'Bronze', minSpend: 0, earnRate: 1.0 },
  { name: 'Silver', minSpend: 1_000_000, earnRate: 1.25 },
  { name: 'Gold', minSpend: 5_000_000, earnRate: 1.5 },
];

// Upsert on the unique tier name, so running it twice is safe.
// A custom tier at the same threshold would hit uq_tiers_min_spend and the upsert would
// overwrite that tier instead. Refuse instead.
export async function seedTiers(ds: DataSource): Promise<void> {
  for (const tier of TIERS) {
    const [clash] = await ds.query(
      `SELECT name FROM tiers WHERE min_spend = ? AND name <> ? LIMIT 1`,
      [tier.minSpend, tier.name],
    );
    if (clash) {
      throw new Error(
        `Cannot seed ${tier.name}: tier "${clash.name}" already has min_spend ${tier.minSpend}`,
      );
    }
    await ds.query(
      `INSERT INTO tiers (name, min_spend, earn_rate) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE min_spend = VALUES(min_spend), earn_rate = VALUES(earn_rate)`,
      [tier.name, tier.minSpend, tier.earnRate],
    );
  }
}

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    await seedTiers(dataSource);
    console.log(`Seeded ${TIERS.length} tiers`);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
