import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';

// Children before parents (FKs). program_settings is kept: the migration owns its one row.
const TABLES = [
  'refunds',
  'redemptions',
  'vouchers',
  'orders',
  'ledger_lots',
  'members',
  'tiers',
  'merchants',
];

export async function resetDatabase(dataSource: DataSource): Promise<void> {
  for (const table of TABLES) {
    await dataSource.query(`DELETE FROM ${table}`);
  }
}

export async function insertMerchant(
  dataSource: DataSource,
  apiKey: string,
  name = 'Shop A',
): Promise<number> {
  const result = await dataSource.query(
    `INSERT INTO merchants (name, api_key_hash) VALUES (?, ?)`,
    [name, createHash('sha256').update(apiKey).digest('hex')],
  );
  return Number(result.insertId);
}
