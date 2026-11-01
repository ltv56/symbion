import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { DemoResetService, WIPED_TABLES } from '../src/demo/demo-reset.service';
import { insertMerchant, resetDatabase } from './helpers/database';
import { memberToken } from './helpers/member-token';

const API_KEY = 'demo-key-demo-key-1234';
const ENV_KEYS = [
  'DEMO_RESET',
  'DEMO_RESET_CRON',
  'DEMO_MODE',
  'DEMO_API_KEY',
] as const;

describe('Demo reset job', () => {
  let app: INestApplication | undefined;
  const saved = new Map<string, string | undefined>();

  beforeAll(() => {
    for (const key of ENV_KEYS) {
      saved.set(key, process.env[key]);
    }
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  // The job is off in every other suite, so a cron tick can't wipe their data.
  async function boot(
    env: Partial<Record<(typeof ENV_KEYS)[number], string>> = {},
  ): Promise<INestApplication> {
    process.env.DEMO_RESET = 'true';
    process.env.DEMO_API_KEY = API_KEY;
    Object.assign(process.env, env);
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    return app;
  }

  const counts = async (ds: DataSource): Promise<Record<string, number>> => {
    const out: Record<string, number> = {};
    for (const table of WIPED_TABLES) {
      const [row] = await ds.query(`SELECT COUNT(*) AS n FROM ${table}`);
      out[table] = Number(row.n);
    }
    return out;
  };

  describe('reset', () => {
    let ds: DataSource;
    let service: DemoResetService;

    beforeEach(async () => {
      const running = await boot();
      ds = running.get(DataSource);
      service = running.get(DemoResetService);
      await resetDatabase(ds);
    });

    it('seeds the demo data from an empty database', async () => {
      const result = await service.reset(new Date());

      const state = await counts(ds);
      expect(state.merchants).toBe(2);
      expect(state.members).toBe(3);
      expect(state.tiers).toBe(3);
      expect(state.vouchers).toBe(3);
      expect(state.orders).toBe(5);
      expect(result.steps).toBe(9);
    });

    it('removes what visitors created and keeps the demo merchant key working', async () => {
      await service.reset(new Date());
      const baseline = await counts(ds);
      const server = (app as INestApplication).getHttpServer();

      // through the real endpoints: an order, a redemption, then rows a visitor made by hand
      await request(server)
        .post('/orders')
        .set('x-api-key', API_KEY)
        .set('Idempotency-Key', 'visitor-order-1')
        .send({ memberEmail: 'member1@demo.example', amount: 3_000_000 })
        .expect(201);
      const token = await memberToken(
        app as INestApplication,
        'member3@demo.example',
      );
      const [voucher] = await ds.query(
        `SELECT id FROM vouchers WHERE title = '20,000 VND off'`,
      );
      await request(server)
        .post('/me/redemptions')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', 'visitor-redeem-1')
        .send({ voucherId: Number(voucher.id) })
        .expect(201);
      const merchant = await insertMerchant(ds, 'visitor-key', 'Visitor Shop');
      await ds.query(
        `INSERT INTO tiers (name, min_spend, earn_rate) VALUES ('Platinum', 20000000, 2.00)`,
      );
      await ds.query(
        `INSERT INTO vouchers (merchant_id, title, face_value, points_price, stock, valid_until)
        VALUES (?, 'Visitor voucher', 10000, 100, 5, '2030-01-01')`,
        [merchant],
      );
      expect(await counts(ds)).not.toEqual(baseline);

      await service.reset(new Date());

      expect(await counts(ds)).toEqual(baseline);
      const [visitor] = await ds.query(
        `SELECT COUNT(*) AS n FROM merchants WHERE name = 'Visitor Shop'`,
      );
      const [platinum] = await ds.query(
        `SELECT COUNT(*) AS n FROM tiers WHERE name = 'Platinum'`,
      );
      expect([Number(visitor.n), Number(platinum.n)]).toEqual([0, 0]);
      const [shop] = await ds.query(
        `SELECT api_key_hash FROM merchants WHERE name = 'Demo Shop'`,
      );
      expect(shop.api_key_hash).toBe(
        createHash('sha256').update(API_KEY).digest('hex'),
      );
    });

    it('gives the same state when it runs twice in a row', async () => {
      await service.reset(new Date());
      const first = await counts(ds);

      await service.reset(new Date());

      expect(await counts(ds)).toEqual(first);
    });

    it('keeps the migrations and the programme settings', async () => {
      const before = {
        migrations: await ds.query('SELECT * FROM migrations ORDER BY id'),
        settings: await ds.query('SELECT * FROM program_settings'),
      };

      await service.reset(new Date());

      expect(await ds.query('SELECT * FROM migrations ORDER BY id')).toEqual(
        before.migrations,
      );
      expect(await ds.query('SELECT * FROM program_settings')).toEqual(
        before.settings,
      );
    });

    it('lists every table, so a new migration cannot leave data behind', async () => {
      const rows: { name: string }[] = await ds.query(
        `SELECT TABLE_NAME AS name FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`,
      );
      const kept = new Set(['migrations', 'program_settings']);
      const tables = rows.map((row) => row.name).filter((n) => !kept.has(n));

      expect([...tables].sort()).toEqual([...WIPED_TABLES].sort());
    });

    it('logs and carries on when a night fails', async () => {
      jest.spyOn(service, 'reset').mockRejectedValueOnce(new Error('boom'));

      await expect(service.run()).resolves.toBeUndefined();
    });

    it('skips a tick while the previous reset is still running', async () => {
      let release: () => void = () => undefined;
      const spy = jest.spyOn(service, 'reset').mockImplementation(
        () =>
          new Promise((resolve) => {
            release = () => resolve({ month: '2026-10', steps: 9 });
          }),
      );

      const first = service.run();
      await service.run();
      expect(spy).toHaveBeenCalledTimes(1);
      release();
      await first;
    });
  });

  describe('schedule', () => {
    it('runs every night at 04:00 in Vietnam', async () => {
      const running = await boot();

      const job = running.get(SchedulerRegistry).getCronJob('demo-reset');

      expect(job.cronTime.source).toBe('0 4 * * *');
      expect(job.cronTime.timeZone).toBe('Asia/Ho_Chi_Minh');
    });

    it('takes the time from DEMO_RESET_CRON', async () => {
      const running = await boot({ DEMO_RESET_CRON: '*/30 * * * * *' });

      const job = running.get(SchedulerRegistry).getCronJob('demo-reset');

      expect(job.cronTime.source).toBe('*/30 * * * * *');
    });

    it('is not registered unless DEMO_RESET is true', async () => {
      const running = await boot({ DEMO_RESET: 'false' });

      expect(() =>
        running.get(SchedulerRegistry).getCronJob('demo-reset'),
      ).toThrow();
    });

    it('refuses to reset when it is not enabled, and deletes nothing', async () => {
      const running = await boot({ DEMO_RESET: 'false' });
      const ds = running.get(DataSource);
      await resetDatabase(ds);
      await insertMerchant(ds, 'kept-key', 'Kept Shop');

      await expect(
        running.get(DemoResetService).reset(new Date()),
      ).rejects.toThrow(/not enabled/);

      const [row] = await ds.query(
        `SELECT COUNT(*) AS n FROM merchants WHERE name = 'Kept Shop'`,
      );
      expect(Number(row.n)).toBe(1);
    });
  });

  describe('refuses to start', () => {
    it('without DEMO_MODE=true, so a real deployment cannot enable it by accident', async () => {
      await expect(boot({ DEMO_MODE: 'false' })).rejects.toThrow(/DEMO_MODE/);
    });

    it('without a DEMO_API_KEY of at least 16 characters', async () => {
      await expect(boot({ DEMO_API_KEY: 'short' })).rejects.toThrow(
        /DEMO_API_KEY/,
      );
    });
  });
});
