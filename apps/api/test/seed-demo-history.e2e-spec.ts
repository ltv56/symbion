import { DataSource } from 'typeorm';
import { Order } from '../src/orders/order.entity';
import { Redemption } from '../src/redemptions/redemption.entity';
import { Refund } from '../src/refunds/refund.entity';
import { seedDemo } from '../src/seed-demo';
import { seedDemoHistory } from '../src/seed-demo-history';
import { resetDatabase } from './helpers/database';

const VIETNAM_OFFSET_MS = 7 * 3_600_000;

// Previous calendar month in Asia/Ho_Chi_Minh as a UTC range [start, end).
function lastMonthRange(now: Date): { start: Date; end: Date } {
  const vn = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const year = vn.getUTCFullYear();
  const month = vn.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - VIETNAM_OFFSET_MS),
    end: new Date(Date.UTC(year, month, 1) - VIETNAM_OFFSET_MS),
  };
}

describe('Demo history seed', () => {
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
      timezone: 'Z',
      entities: [Order, Redemption, Refund],
    });
    await dataSource.initialize();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    await seedDemo(dataSource, apiKey);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const merchantId = async (name: string): Promise<number> => {
    const [row] = await dataSource.query(
      'SELECT id FROM merchants WHERE name = ?',
      [name],
    );
    return Number(row.id);
  };

  const sum = async (sql: string, params: unknown[]): Promise<number> => {
    const [row] = await dataSource.query(sql, params);
    return Number(row.total ?? 0);
  };

  it('adds a second merchant and vouchers', async () => {
    await seedDemoHistory(dataSource, apiKey, new Date());

    const merchants = await dataSource.query(
      'SELECT name FROM merchants ORDER BY name',
    );
    expect(merchants.map((m: { name: string }) => m.name)).toEqual([
      'Demo Cafe',
      'Demo Shop',
    ]);
    const vouchers = await dataSource.query(
      `SELECT title, status FROM vouchers ORDER BY title`,
    );
    expect(vouchers).toHaveLength(3);
    for (const voucher of vouchers) {
      expect(voucher.status).toBe('active');
    }
  });

  const shopInfo = async () => ({
    merchants: await dataSource.query(
      'SELECT name, address FROM merchants ORDER BY name',
    ),
    vouchers: await dataSource.query(
      'SELECT title, description, steps FROM vouchers ORDER BY title',
    ),
  });

  it('gives the merchants an address and the vouchers a description and steps', async () => {
    await seedDemoHistory(dataSource, apiKey, new Date());

    const { merchants, vouchers } = await shopInfo();
    for (const merchant of merchants) {
      expect(merchant.address).toEqual(expect.any(String));
    }
    for (const voucher of vouchers) {
      expect(voucher.description).toEqual(expect.any(String));
      expect(voucher.steps).toEqual(
        expect.arrayContaining([expect.any(String)]),
      );
      expect(voucher.steps.length).toBeLessThanOrEqual(10);
    }
  });

  it('seeds the content in Vietnamese', async () => {
    await seedDemoHistory(dataSource, apiKey, new Date());

    const { merchants, vouchers } = await shopInfo();
    expect(vouchers.map((v: { title: string }) => v.title).sort()).toEqual(
      ['Cà phê miễn phí', 'Giảm 100.000đ', 'Giảm 20.000đ'].sort(),
    );
    expect(merchants.map((m: { address: string }) => m.address).sort()).toEqual(
      [
        '12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
        '85 Lê Lợi, Quận 1, TP. Hồ Chí Minh',
      ].sort(),
    );
    const vietnamese = /[à-ỹđ]/i;
    for (const voucher of vouchers) {
      expect(voucher.description).toMatch(vietnamese);
      for (const step of voucher.steps as string[]) {
        expect(step).toMatch(vietnamese);
      }
    }
  });

  it('fills the info again on a rerun', async () => {
    const now = new Date();
    await seedDemoHistory(dataSource, apiKey, now);
    const first = await shopInfo();
    await dataSource.query('UPDATE merchants SET address = NULL');
    await dataSource.query(
      'UPDATE vouchers SET description = NULL, steps = NULL',
    );

    await seedDemoHistory(dataSource, apiKey, now);

    expect(await shopInfo()).toEqual(first);
  });

  it('dates every event in the previous month', async () => {
    const now = new Date();
    await seedDemoHistory(dataSource, apiKey, now);
    const { start, end } = lastMonthRange(now);

    for (const [table, column] of [
      ['orders', 'created_at'],
      ['refunds', 'created_at'],
      ['redemptions', 'created_at'],
      ['redemptions', 'used_at'],
      ['ledger_lots', 'created_at'],
    ]) {
      const outside = await sum(
        `SELECT COUNT(*) AS total FROM ${table}
        WHERE ${column} IS NOT NULL AND (${column} < ? OR ${column} >= ?)`,
        [start, end],
      );
      expect([table, column, outside]).toEqual([table, column, 0]);
    }
    const orders = await sum('SELECT COUNT(*) AS total FROM orders', []);
    expect(orders).toBe(5);
  });

  it('gives the report three lines of numbers for the previous month', async () => {
    const now = new Date();
    await seedDemoHistory(dataSource, apiKey, now);
    const { start, end } = lastMonthRange(now);
    const shop = await merchantId('Demo Shop');
    const cafe = await merchantId('Demo Cafe');

    const earned = (id: number) =>
      sum(
        `SELECT SUM(points) AS total FROM ledger_lots
        WHERE type = 'earn' AND merchant_id = ? AND created_at >= ? AND created_at < ?`,
        [id, start, end],
      );
    const redeemed = (id: number) =>
      sum(
        `SELECT SUM(points) AS total FROM redemptions
        WHERE status = 'used' AND merchant_id = ? AND used_at >= ? AND used_at < ?`,
        [id, start, end],
      );
    const refunded = (id: number) =>
      sum(
        `SELECT SUM(points_deducted) AS total FROM refunds
        WHERE merchant_id = ? AND created_at >= ? AND created_at < ?`,
        [id, start, end],
      );

    expect(await earned(shop)).toBe(700);
    expect(await earned(cafe)).toBe(350);
    expect(await redeemed(shop)).toBe(150);
    expect(await redeemed(cafe)).toBe(300);
    expect(await refunded(shop)).toBe(25);
    expect(await refunded(cafe)).toBe(0);
  });

  it('leaves a code issued but not confirmed', async () => {
    await seedDemoHistory(dataSource, apiKey, new Date());

    const statuses = await dataSource.query(
      `SELECT status, COUNT(*) AS n FROM redemptions GROUP BY status ORDER BY status`,
    );
    expect(
      statuses.map((s: { status: string; n: number }) => [
        s.status,
        Number(s.n),
      ]),
    ).toEqual([
      ['issued', 1],
      ['used', 2],
    ]);
  });

  it('keeps balances and tiers consistent with the events', async () => {
    await seedDemoHistory(dataSource, apiKey, new Date());

    const members = await dataSource.query(
      `SELECT m.email, t.name AS tier,
        (SELECT COALESCE(SUM(remaining), 0) FROM ledger_lots l
          WHERE l.member_id = m.id AND (l.expires_at IS NULL OR l.expires_at > NOW())) AS balance
      FROM members m JOIN tiers t ON t.id = m.tier_id
      ORDER BY m.email`,
    );
    expect(
      members.map((m: { email: string; tier: string; balance: string }) => [
        m.email,
        m.tier,
        Number(m.balance),
      ]),
    ).toEqual([
      ['member1@demo.example', 'Bronze', 25],
      ['member2@demo.example', 'Silver', 100],
      ['member3@demo.example', 'Gold', 300],
    ]);
  });

  it('can run twice without changing anything', async () => {
    const now = new Date();
    await seedDemoHistory(dataSource, apiKey, now);
    const snapshot = async () => ({
      lots: await dataSource.query(
        'SELECT merchant_id, member_id, points, remaining, created_at, expires_at FROM ledger_lots ORDER BY id',
      ),
      redemptions: await dataSource.query(
        'SELECT code, status, used_at, created_at, expires_at FROM redemptions ORDER BY id',
      ),
      counts: await dataSource.query(
        `SELECT (SELECT COUNT(*) FROM orders) AS orders,
          (SELECT COUNT(*) FROM refunds) AS refunds,
          (SELECT COUNT(*) FROM vouchers) AS vouchers,
          (SELECT COUNT(*) FROM merchants) AS merchants,
          (SELECT SUM(stock) FROM vouchers) AS stock`,
      ),
    });
    const first = await snapshot();

    await seedDemoHistory(dataSource, apiKey, now);

    expect(await snapshot()).toEqual(first);
  });
});
