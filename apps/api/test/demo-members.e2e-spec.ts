import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { insertMerchant, resetDatabase } from './helpers/database';

const bootApp = async (): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
};

describe('Demo members', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let shop: number;
  let bronze: number;
  let silver: number;
  const DAY = 86_400_000;
  let seq = 0;

  beforeAll(async () => {
    app = await bootApp();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    shop = await insertMerchant(dataSource, 'key-a');
    const tiers = await dataSource.query(
      `INSERT INTO tiers (name, min_spend, earn_rate) VALUES ('Bronze', 0, 1.00), ('Silver', 1000000, 1.25)`,
    );
    bronze = Number(tiers.insertId);
    silver = bronze + 1;
  });

  afterAll(async () => {
    await app.close();
  });

  const insertMember = async (
    email: string,
    name: string | null,
    tierId = bronze,
  ): Promise<number> => {
    const result = await dataSource.query(
      `INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, ?, ?)`,
      [shop, tierId, email, name],
    );
    return Number(result.insertId);
  };

  const insertLot = (
    memberId: number,
    points: number,
    { remaining = points, expiresAt = null as Date | null } = {},
  ) =>
    dataSource.query(
      `INSERT INTO ledger_lots (merchant_id, member_id, points, remaining, idempotency_key, type, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        shop,
        memberId,
        points,
        remaining,
        `seed-${++seq}`,
        points > 0 ? 'earn' : 'spend',
        expiresAt,
      ],
    );

  const list = () => request(app.getHttpServer()).get('/demo/members');

  it('lists the members in id order with tier and balance, without a token', async () => {
    const john = await insertMember('john@example.com', 'John Nguyen');
    const jane = await insertMember('jane@example.com', null, silver);
    await insertLot(john, 1000, { remaining: 600 });
    await insertLot(jane, 400);

    const res = await list().expect(200);

    expect(res.body).toEqual([
      {
        email: 'john@example.com',
        name: 'John Nguyen',
        tierName: 'Bronze',
        balance: 600,
      },
      {
        email: 'jane@example.com',
        name: null,
        tierName: 'Silver',
        balance: 400,
      },
    ]);
  });

  it('counts only unexpired lots and shows a debt as a negative balance', async () => {
    const john = await insertMember('john@example.com', 'John');
    const jane = await insertMember('jane@example.com', 'Jane');
    await insertLot(john, 500, { expiresAt: new Date(Date.now() - DAY) });
    await insertLot(john, 200, { expiresAt: new Date(Date.now() + DAY) });
    await insertLot(jane, -140, { remaining: -140 });

    const res = await list().expect(200);

    expect(res.body.map((m: { balance: number }) => m.balance)).toEqual([
      200, -140,
    ]);
  });

  it('returns an empty list when there are no members', async () => {
    const res = await list().expect(200);

    expect(res.body).toEqual([]);
  });

  it('returns at most 20 members, the oldest first', async () => {
    for (let i = 1; i <= 21; i++) {
      await insertMember(`member${i}@example.com`, `Member ${i}`);
    }

    const res = await list().expect(200);

    expect(res.body).toHaveLength(20);
    expect(res.body[0].email).toBe('member1@example.com');
    expect(res.body[19].email).toBe('member20@example.com');
  });

  describe('without DEMO_MODE', () => {
    let plainApp: INestApplication;

    beforeAll(async () => {
      delete process.env.DEMO_MODE;
      plainApp = await bootApp();
    });

    afterAll(async () => {
      process.env.DEMO_MODE = 'true';
      await plainApp.close();
    });

    it('answers 404 even when members exist', async () => {
      await insertMember('john@example.com', 'John');

      await request(plainApp.getHttpServer()).get('/demo/members').expect(404);
    });
  });
});
