import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Ledger } from '@symbion/ledger';
import request from 'supertest';
import { DataSource, EntityManager } from 'typeorm';
import { AppModule } from '../src/app.module';
import { PointExpiryService } from '../src/ledger/point-expiry.service';
import { insertMerchant, resetDatabase } from './helpers/database';
import { memberToken } from './helpers/member-token';

describe('Point expiry job', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let service: PointExpiryService;
  let ledger: Ledger<EntityManager>;
  let merchantId: number;
  let seq = 0;
  const DAY = 86_400_000;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    service = app.get(PointExpiryService);
    ledger = app.get(Ledger);
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    merchantId = await insertMerchant(dataSource, 'test-api-key');
    await dataSource.query(
      `INSERT INTO tiers (name, min_spend, earn_rate) VALUES ('Bronze', 0, 1.00)`,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const addMember = async (email = `member${++seq}@example.com`) => {
    const result = await dataSource.query(
      `INSERT INTO members (merchant_id, tier_id, email, name)
      SELECT ?, id, ?, 'Member' FROM tiers LIMIT 1`,
      [merchantId, email],
    );
    return { id: Number(result.insertId), email };
  };

  const addLot = async (
    memberId: number,
    points: number,
    expiresInDays: number | null,
    remaining = points,
  ): Promise<number> => {
    const result = await dataSource.query(
      `INSERT INTO ledger_lots (merchant_id, member_id, points, remaining, expires_at, idempotency_key, type)
      VALUES (?, ?, ?, ?, ?, ?, 'earn')`,
      [
        merchantId,
        memberId,
        points,
        remaining,
        expiresInDays === null
          ? null
          : new Date(Date.now() + expiresInDays * DAY),
        `lot-${++seq}`,
      ],
    );
    return Number(result.insertId);
  };

  const lots = (memberId: number) =>
    dataSource.query(
      `SELECT id, type, points, remaining, ref_type, ref_id FROM ledger_lots WHERE member_id = ? ORDER BY id`,
      [memberId],
    );

  const balance = async (memberId: number): Promise<number> => {
    const [row] = await dataSource.query(
      `SELECT COALESCE(SUM(remaining), 0) AS total FROM ledger_lots
      WHERE member_id = ? AND (expires_at IS NULL OR expires_at > NOW(3))`,
      [memberId],
    );
    return Number(row.total);
  };

  it('zeroes an expired lot, writes an expire entry and keeps the balance', async () => {
    const member = await addMember();
    const expired = await addLot(member.id, 100, -1);
    await addLot(member.id, 50, 30);
    const before = await balance(member.id);

    const result = await service.expireAll(new Date());

    expect(result).toEqual({ members: 1, lots: 1, points: 100 });
    const rows = await lots(member.id);
    expect(rows[0]).toMatchObject({ id: expired, remaining: 0 });
    expect(rows[2]).toMatchObject({
      type: 'expire',
      points: -100,
      remaining: 0,
      ref_type: 'lot',
      ref_id: expired,
    });
    expect(await balance(member.id)).toBe(before);
  });

  it('expires only what is left of a partly spent lot', async () => {
    const member = await addMember();
    await addLot(member.id, 100, -1, 40);

    const result = await service.expireAll(new Date());

    expect(result.points).toBe(40);
    const rows = await lots(member.id);
    expect(rows[1]).toMatchObject({ type: 'expire', points: -40 });
  });

  it('leaves lots without expiry, future lots and debt alone', async () => {
    const member = await addMember();
    await addLot(member.id, 100, null);
    await addLot(member.id, 100, 5);
    await dataSource.query(
      `INSERT INTO ledger_lots (merchant_id, member_id, points, remaining, idempotency_key, type)
      VALUES (?, ?, -30, -30, 'debt-1', 'spend')`,
      [merchantId, member.id],
    );

    const result = await service.expireAll(new Date());

    expect(result).toEqual({ members: 0, lots: 0, points: 0 });
    expect(await lots(member.id)).toHaveLength(3);
  });

  it('writes nothing on a second run', async () => {
    const member = await addMember();
    await addLot(member.id, 100, -1);
    await service.expireAll(new Date());

    const second = await service.expireAll(new Date());

    expect(second).toEqual({ members: 0, lots: 0, points: 0 });
    expect(await lots(member.id)).toHaveLength(2);
  });

  it('works through every member, not only the first batch', async () => {
    const first = await addMember();
    const second = await addMember();
    await addLot(first.id, 10, -1);
    await addLot(second.id, 20, -1);

    const result = await service.expireAll(new Date(), 1);

    expect(result).toEqual({ members: 2, lots: 2, points: 30 });
  });

  it('keeps the total right when a spend runs at the same time', async () => {
    const member = await addMember();
    await addLot(member.id, 100, -1);
    await addLot(member.id, 100, 30);

    await Promise.all([
      service.expireAll(new Date()),
      dataSource.transaction((tx) =>
        ledger.spend(tx, {
          merchantId: String(merchantId),
          memberId: String(member.id),
          points: 60,
          idempotencyKey: 'spend-1',
          now: new Date(),
        }),
      ),
    ]);

    expect(await balance(member.id)).toBe(40);
    const rows = await lots(member.id);
    expect(
      rows.filter((r: { type: string }) => r.type === 'expire'),
    ).toHaveLength(1);
  });

  it('keeps expire entries out of GET /me/history', async () => {
    const member = await addMember('hist@example.com');
    await addLot(member.id, 100, -1);
    await service.expireAll(new Date());
    const token = await memberToken(app, member.email);

    const res = await request(app.getHttpServer())
      .get('/me/history')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.map((e: { type: string }) => e.type)).toEqual(['earn']);
  });
});
