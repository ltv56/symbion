import { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { addMonths } from '../src/common/add-months';
import { TierDowngradeService } from '../src/tiers/tier-downgrade.service';
import { insertMerchant, resetDatabase } from './helpers/database';

describe('Tier downgrade job', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let service: TierDowngradeService;
  let merchantId: number;
  let seq = 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    service = app.get(TierDowngradeService);
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    merchantId = await insertMerchant(dataSource, 'test-api-key');
    await dataSource.query(
      `INSERT INTO tiers (name, min_spend, earn_rate)
      VALUES ('Bronze', 0, 1.00), ('Silver', 1000000, 1.25), ('Gold', 5000000, 1.50)`,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const addMember = async (tier: string): Promise<number> => {
    const result = await dataSource.query(
      `INSERT INTO members (merchant_id, tier_id, email, name)
      SELECT ?, id, ?, 'Member' FROM tiers WHERE name = ?`,
      [merchantId, `member${++seq}@example.com`, tier],
    );
    return Number(result.insertId);
  };

  const addOrder = async (
    memberId: number,
    amount: number,
    createdAt: Date,
  ): Promise<number> => {
    const result = await dataSource.query(
      `INSERT INTO orders (merchant_id, member_id, idempotency_key, amount, created_at)
      VALUES (?, ?, ?, ?, ?)`,
      [merchantId, memberId, `order-${++seq}`, amount, createdAt],
    );
    return Number(result.insertId);
  };

  const tierOf = async (memberId: number): Promise<string> => {
    const [row] = await dataSource.query(
      `SELECT t.name FROM members m JOIN tiers t ON t.id = m.tier_id WHERE m.id = ?`,
      [memberId],
    );
    return row.name;
  };

  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

  it('moves a member down when the orders have left the 12-month window', async () => {
    const member = await addMember('Gold');
    await addOrder(member, 5_000_000, addMonths(new Date(), -13));

    const result = await service.downgrade(new Date());

    await expect(tierOf(member)).resolves.toBe('Bronze');
    expect(result).toEqual({ checked: 1, downgraded: 1 });
  });

  it('keeps a member whose spend still reaches the tier', async () => {
    const member = await addMember('Gold');
    await addOrder(member, 5_000_000, daysAgo(30));

    const result = await service.downgrade(new Date());

    await expect(tierOf(member)).resolves.toBe('Gold');
    expect(result).toEqual({ checked: 1, downgraded: 0 });
  });

  it('moves down to the tier the remaining spend reaches', async () => {
    const member = await addMember('Gold');
    await addOrder(member, 5_000_000, addMonths(new Date(), -13));
    await addOrder(member, 1_200_000, daysAgo(10));

    await service.downgrade(new Date());

    await expect(tierOf(member)).resolves.toBe('Silver');
  });

  it('subtracts refunds from the spend', async () => {
    const member = await addMember('Gold');
    const order = await addOrder(member, 6_000_000, daysAgo(10));
    await dataSource.query(
      `INSERT INTO refunds (merchant_id, order_id, idempotency_key, amount, points_deducted)
      VALUES (?, ?, 'refund-1', 4500000, 0)`,
      [merchantId, order],
    );

    await service.downgrade(new Date());

    await expect(tierOf(member)).resolves.toBe('Silver');
  });

  it('does not look at members on the lowest tier', async () => {
    const bronze = await addMember('Bronze');
    await addOrder(bronze, 9_000_000, daysAgo(5));

    const result = await service.downgrade(new Date());

    await expect(tierOf(bronze)).resolves.toBe('Bronze');
    expect(result).toEqual({ checked: 0, downgraded: 0 });
  });

  it('goes through every member when they do not fit in one batch', async () => {
    const members: number[] = [];
    for (let i = 0; i < 5; i++) {
      members.push(await addMember('Gold'));
    }

    const result = await service.downgrade(new Date(), 2);

    for (const member of members) {
      await expect(tierOf(member)).resolves.toBe('Bronze');
    }
    expect(result).toEqual({ checked: 5, downgraded: 5 });
  });

  it('uses the given time for the window', async () => {
    const member = await addMember('Gold');
    await addOrder(member, 5_000_000, daysAgo(30));

    await service.downgrade(addMonths(new Date(), 12));

    await expect(tierOf(member)).resolves.toBe('Bronze');
  });

  it('is scheduled every night at 03:00 in Vietnam', () => {
    const job = app.get(SchedulerRegistry).getCronJob('tier-downgrade');

    expect(job.cronTime.source).toBe('0 3 * * *');
    expect(job.cronTime.timeZone).toBe('Asia/Ho_Chi_Minh');
  });
});
