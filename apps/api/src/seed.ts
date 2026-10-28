import { DataSource } from 'typeorm';
import dataSource from './data-source';

const TIERS = [
  { name: 'Bronze', minPoints: 0, earnRate: 1.0 },
  { name: 'Silver', minPoints: 1000, earnRate: 1.25 },
  { name: 'Gold', minPoints: 5000, earnRate: 1.5 },
];

// Upsert on the unique tier name, so running it twice is safe.
// Only the name is unique, so a custom tier at the same threshold would tie with ours
// and members could get either earn rate. Refuse instead of guessing which one wins.
export async function seedTiers(ds: DataSource): Promise<void> {
  for (const tier of TIERS) {
    const [clash] = await ds.query(
      `SELECT name FROM tiers WHERE min_points = ? AND name <> ? LIMIT 1`,
      [tier.minPoints, tier.name],
    );
    if (clash) {
      throw new Error(
        `Cannot seed ${tier.name}: tier "${clash.name}" already has min_points ${tier.minPoints}`,
      );
    }
    await ds.query(
      `INSERT INTO tiers (name, min_points, earn_rate) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE min_points = VALUES(min_points), earn_rate = VALUES(earn_rate)`,
      [tier.name, tier.minPoints, tier.earnRate],
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
