import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Order } from '../src/orders/order.entity';
import { Redemption } from '../src/redemptions/redemption.entity';
import { Refund } from '../src/refunds/refund.entity';
import { seedDemo } from '../src/seed-demo';
import { seedDemoHistory } from '../src/seed-demo-history';
import { resetDatabase } from './helpers/database';

const VIETNAM_OFFSET_MS = 7 * 3_600_000;
const VIETNAMESE = /[à-ỹđ]/i;

// Calendar month `monthsAgo` before now in Asia/Ho_Chi_Minh as a UTC range [start, end).
function monthRange(now: Date, monthsAgo: number): { start: Date; end: Date } {
  const vn = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const year = vn.getUTCFullYear();
  const month = vn.getUTCMonth() - monthsAgo;
  return {
    start: new Date(Date.UTC(year, month, 1) - VIETNAM_OFFSET_MS),
    end: new Date(Date.UTC(year, month + 1, 1) - VIETNAM_OFFSET_MS),
  };
}

const MERCHANT_NAMES = [
  'Cà Phê Hẻm Xanh',
  'Hiệu Sách Gác Nhỏ',
  'Quán Phở Gánh',
  'Tạp Hoá Cây Me',
  'Tiệm Bánh Nắng Mai',
  'Trà Sữa Mây Chiều',
];

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

  afterAll(async () => {
    await dataSource.destroy();
  });

  const reseed = async (now: Date) => {
    await resetDatabase(dataSource);
    await seedDemo(dataSource, apiKey);
    return seedDemoHistory(dataSource, apiKey, now);
  };

  const count = async (sql: string, params: unknown[] = []) => {
    const [row] = await dataSource.query(sql, params);
    return Number(row.total ?? 0);
  };

  describe('after one seed', () => {
    const now = new Date();

    beforeAll(async () => {
      await reseed(now);
    });

    it('creates six merchants with a Vietnamese address', async () => {
      const merchants = await dataSource.query(
        'SELECT name, address, api_key_hash FROM merchants ORDER BY name',
      );
      expect(merchants.map((m: { name: string }) => m.name)).toEqual(
        MERCHANT_NAMES,
      );
      for (const merchant of merchants) {
        expect(merchant.address).toMatch(VIETNAMESE);
      }
      const shop = merchants.find(
        (m: { name: string }) => m.name === 'Tạp Hoá Cây Me',
      );
      expect(shop.api_key_hash).toBe(
        createHash('sha256').update(apiKey).digest('hex'),
      );
    });

    it('creates fifteen vouchers with a Vietnamese description and steps', async () => {
      const vouchers = await dataSource.query(
        'SELECT title, description, steps FROM vouchers',
      );
      expect(vouchers).toHaveLength(15);
      expect(
        new Set(vouchers.map((v: { title: string }) => v.title)).size,
      ).toBe(15);
      for (const voucher of vouchers) {
        expect(voucher.description).toMatch(VIETNAMESE);
        expect(voucher.steps.length).toBeGreaterThanOrEqual(1);
        expect(voucher.steps.length).toBeLessThanOrEqual(10);
        for (const step of voucher.steps as string[]) {
          expect(step).toMatch(VIETNAMESE);
        }
      }
    });

    it('covers the voucher states: sold out, nearly sold out, ending soon, stopped', async () => {
      const stockOf = (title: string) =>
        count('SELECT stock AS total FROM vouchers WHERE title = ?', [title]);

      expect(await stockOf('Sổ tay bìa da')).toBe(0);
      expect(await stockOf('Combo cà phê + bánh')).toBe(2);
      expect(
        await count(
          `SELECT COUNT(*) AS total FROM vouchers
          WHERE status = 'active' AND valid_until > NOW()
            AND valid_until < NOW() + INTERVAL 10 DAY`,
        ),
      ).toBe(1);
      expect(
        await count(
          `SELECT COUNT(*) AS total FROM vouchers WHERE status = 'expired'`,
        ),
      ).toBe(1);
    });

    it('creates ten members with Vietnamese names', async () => {
      const members = await dataSource.query(
        'SELECT email, name FROM members ORDER BY id',
      );
      expect(members).toHaveLength(10);
      for (const member of members) {
        expect(member.name).toMatch(VIETNAMESE);
      }
    });

    it('keeps tiers and balances consistent with the events', async () => {
      const members = await dataSource.query(
        `SELECT m.email, t.name AS tier,
          (SELECT COALESCE(SUM(remaining), 0) FROM ledger_lots l
            WHERE l.member_id = m.id AND (l.expires_at IS NULL OR l.expires_at > NOW())) AS balance
        FROM members m JOIN tiers t ON t.id = m.tier_id`,
      );
      const byEmail = new Map<string, { tier: string; balance: number }>(
        members.map((m: { email: string; tier: string; balance: string }) => [
          m.email,
          { tier: m.tier, balance: Number(m.balance) },
        ]),
      );
      const expected: [number, string, number | null][] = [
        [1, 'Bronze', 39],
        [2, 'Silver', 418],
        [3, 'Gold', null],
        [4, 'Bronze', -140],
        [5, 'Bronze', 55],
        [6, 'Bronze', 30],
        [7, 'Silver', 487],
        [8, 'Silver', 130],
        [9, 'Bronze', 0],
        [10, 'Gold', 85],
      ];
      for (const [n, tier, balance] of expected) {
        const row = byEmail.get(`member${n}@demo.example`);
        expect([n, row?.tier]).toEqual([n, tier]);
        if (balance !== null) {
          expect([n, row?.balance]).toEqual([n, balance]);
        }
      }
      expect(byEmail.get('member3@demo.example')!.balance).toBeGreaterThan(0);
    });

    it('leaves member 9 with no events', async () => {
      const lots = await count(
        `SELECT COUNT(*) AS total FROM ledger_lots l
        JOIN members m ON m.id = l.member_id WHERE m.email = 'member9@demo.example'`,
      );
      expect(lots).toBe(0);
    });

    it('gives member 3 more history rows than one page', async () => {
      const lots = await count(
        `SELECT COUNT(*) AS total FROM ledger_lots l
        JOIN members m ON m.id = l.member_id WHERE m.email = 'member3@demo.example'`,
      );
      expect(lots).toBeGreaterThan(50);
    });

    it('lets a refund after the points were spent leave a negative balance', async () => {
      const [row] = await dataSource.query(
        `SELECT COUNT(*) AS debts FROM ledger_lots l
        JOIN members m ON m.id = l.member_id
        WHERE m.email = 'member4@demo.example' AND l.remaining < 0`,
      );
      expect(Number(row.debts)).toBeGreaterThan(0);
    });

    it('deducts several partial refunds of one order by the total refunded', async () => {
      const refunds = await dataSource.query(
        `SELECT r.points_deducted FROM refunds r
        JOIN orders o ON o.id = r.order_id
        JOIN members m ON m.id = o.member_id
        WHERE m.email = 'member10@demo.example' ORDER BY r.id`,
      );
      const deducted = refunds.map((r: { points_deducted: number }) =>
        Number(r.points_deducted),
      );
      expect(deducted).toHaveLength(3);
      expect(deducted.reduce((a: number, b: number) => a + b, 0)).toBe(195);
    });

    it('keeps one valid code, one expired code and seven used codes', async () => {
      const statuses = await dataSource.query(
        `SELECT status, COUNT(*) AS n FROM redemptions GROUP BY status ORDER BY status`,
      );
      expect(
        statuses.map((s: { status: string; n: number }) => [
          s.status,
          Number(s.n),
        ]),
      ).toEqual([
        ['issued', 2],
        ['used', 7],
      ]);
      expect(
        await count(
          `SELECT COUNT(*) AS total FROM redemptions
          WHERE status = 'issued' AND expires_at < NOW()`,
        ),
      ).toBe(1);
      expect(
        await count(
          `SELECT COUNT(*) AS total FROM redemptions
          WHERE status = 'issued' AND expires_at > NOW()`,
        ),
      ).toBe(1);
    });

    it('has points that expire within 30 days and points that already expired', async () => {
      expect(
        await count(
          `SELECT COUNT(*) AS total FROM ledger_lots
          WHERE type = 'earn' AND remaining > 0
            AND expires_at > NOW() AND expires_at < NOW() + INTERVAL 30 DAY`,
        ),
      ).toBe(2);
      expect(
        await count(
          `SELECT COUNT(*) AS total FROM ledger_lots
          WHERE type = 'earn' AND remaining > 0 AND expires_at < NOW()`,
        ),
      ).toBe(2);
    });

    it('dates every event within the last 14 months and never in the future', async () => {
      for (const [table, column] of [
        ['orders', 'created_at'],
        ['refunds', 'created_at'],
        ['redemptions', 'created_at'],
        ['redemptions', 'used_at'],
        ['ledger_lots', 'created_at'],
      ]) {
        const outside = await count(
          `SELECT COUNT(*) AS total FROM ${table}
          WHERE ${column} IS NOT NULL
            AND (${column} > NOW() OR ${column} < NOW() - INTERVAL 14 MONTH)`,
        );
        expect([table, column, outside]).toEqual([table, column, 0]);
      }
      expect(await count('SELECT COUNT(*) AS total FROM orders')).toBe(78);
      expect(await count('SELECT COUNT(*) AS total FROM refunds')).toBe(7);
    });

    it('gives the report earned points in each of the last five months', async () => {
      for (const monthsAgo of [1, 2, 3, 4, 5]) {
        const { start, end } = monthRange(now, monthsAgo);
        const earned = await count(
          `SELECT SUM(points) AS total FROM ledger_lots
          WHERE type = 'earn' AND created_at >= ? AND created_at < ?`,
          [start, end],
        );
        expect([monthsAgo, earned > 0]).toEqual([monthsAgo, true]);
      }
    });

    it('gives last month a refund line and confirmed vouchers', async () => {
      const { start, end } = monthRange(now, 1);
      expect(
        await count(
          `SELECT SUM(points_deducted) AS total FROM refunds
          WHERE created_at >= ? AND created_at < ?`,
          [start, end],
        ),
      ).toBeGreaterThan(0);
      expect(
        await count(
          `SELECT SUM(points) AS total FROM redemptions
          WHERE status = 'used' AND used_at >= ? AND used_at < ?`,
          [start, end],
        ),
      ).toBeGreaterThan(0);
    });

    it('saves favorites for several members', async () => {
      expect(
        await count('SELECT COUNT(*) AS total FROM voucher_favorites'),
      ).toBeGreaterThanOrEqual(6);
      expect(
        await count(
          `SELECT COUNT(DISTINCT member_id) AS total FROM voucher_favorites`,
        ),
      ).toBeGreaterThanOrEqual(3);
    });
  });

  describe('on a rerun', () => {
    it('changes nothing', async () => {
      const now = new Date();
      await reseed(now);
      const snapshot = async () => ({
        lots: await dataSource.query(
          'SELECT merchant_id, member_id, points, remaining, created_at, expires_at FROM ledger_lots ORDER BY id',
        ),
        redemptions: await dataSource.query(
          'SELECT code, status, used_at, created_at, expires_at FROM redemptions ORDER BY id',
        ),
        vouchers: await dataSource.query(
          'SELECT title, status, stock, description, steps FROM vouchers ORDER BY id',
        ),
        merchants: await dataSource.query(
          'SELECT name, address FROM merchants ORDER BY id',
        ),
        counts: await dataSource.query(
          `SELECT (SELECT COUNT(*) FROM orders) AS orders,
            (SELECT COUNT(*) FROM refunds) AS refunds,
            (SELECT COUNT(*) FROM voucher_favorites) AS favorites,
            (SELECT COUNT(*) FROM members) AS members`,
        ),
      });
      const first = await snapshot();

      await seedDemo(dataSource, apiKey);
      await seedDemoHistory(dataSource, apiKey, now);

      expect(await snapshot()).toEqual(first);
    });

    it('fills the shop info again', async () => {
      const now = new Date();
      await reseed(now);
      await dataSource.query('UPDATE merchants SET address = NULL');
      await dataSource.query(
        'UPDATE vouchers SET description = NULL, steps = NULL',
      );

      await seedDemoHistory(dataSource, apiKey, now);

      expect(
        await count(
          'SELECT COUNT(*) AS total FROM merchants WHERE address IS NULL',
        ),
      ).toBe(0);
      expect(
        await count(
          'SELECT COUNT(*) AS total FROM vouchers WHERE description IS NULL OR steps IS NULL',
        ),
      ).toBe(0);
    });
  });
});
