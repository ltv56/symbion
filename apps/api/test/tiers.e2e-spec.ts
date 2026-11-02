import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { adminToken } from './helpers/admin-token';
import { insertMerchant, resetDatabase } from './helpers/database';

describe('Tiers', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    token = await adminToken(app);
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  const create = (body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/tiers')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  it('lists no tiers when there are none', async () => {
    const res = await request(app.getHttpServer()).get('/tiers').expect(200);
    expect(res.body).toEqual([]);
  });

  it('lists tiers by min_spend ascending with earnRate as a number', async () => {
    await dataSource.query(
      `INSERT INTO tiers (name, min_spend, earn_rate) VALUES ('Gold', 5000000, 1.50), ('Bronze', 0, 1.00), ('Silver', 1000000, 1.25)`,
    );

    const res = await request(app.getHttpServer()).get('/tiers').expect(200);

    expect(res.body.map((t: { name: string }) => t.name)).toEqual([
      'Bronze',
      'Silver',
      'Gold',
    ]);
    expect(res.body[1]).toEqual({
      id: expect.any(Number),
      name: 'Silver',
      minSpend: 1_000_000,
      earnRate: 1.25,
    });
  });

  it('gets a tier by id', async () => {
    const created = await create({
      name: 'Silver',
      minSpend: 1_000_000,
      earnRate: 1.25,
    }).expect(201);

    const res = await request(app.getHttpServer())
      .get(`/tiers/${created.body.id}`)
      .expect(200);

    expect(res.body).toEqual(created.body);
  });

  it('returns 404 for an unknown id', async () => {
    await request(app.getHttpServer()).get('/tiers/999999').expect(404);
  });

  it('returns 400 when the id is not an integer', async () => {
    await request(app.getHttpServer()).get('/tiers/abc').expect(400);
  });

  it('creates a tier', async () => {
    const res = await create({
      name: '  Silver ',
      minSpend: 1_000_000,
      earnRate: 1.25,
    }).expect(201);

    expect(res.body).toEqual({
      id: expect.any(Number),
      name: 'Silver',
      minSpend: 1_000_000,
      earnRate: 1.25,
    });
    const rows = await dataSource.query(
      'SELECT name, min_spend, earn_rate FROM tiers WHERE id = ?',
      [res.body.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Silver');
  });

  it.each([
    ['a missing name', { minSpend: 1, earnRate: 1 }],
    ['a blank name', { name: '   ', minSpend: 1, earnRate: 1 }],
    [
      'a name over 255 characters',
      { name: 'a'.repeat(256), minSpend: 1, earnRate: 1 },
    ],
    ['a missing minSpend', { name: 'T', earnRate: 1 }],
    ['a negative minSpend', { name: 'T', minSpend: -1, earnRate: 1 }],
    ['a fractional minSpend', { name: 'T', minSpend: 1.5, earnRate: 1 }],
    ['a string minSpend', { name: 'T', minSpend: '10', earnRate: 1 }],
    [
      'a minSpend over 9999999999',
      { name: 'T', minSpend: 10_000_000_000, earnRate: 1 },
    ],
    ['a missing earnRate', { name: 'T', minSpend: 1 }],
    ['a zero earnRate', { name: 'T', minSpend: 1, earnRate: 0 }],
    ['an earnRate over 999.99', { name: 'T', minSpend: 1, earnRate: 1000 }],
    [
      'an earnRate with 3 decimals',
      { name: 'T', minSpend: 1, earnRate: 1.234 },
    ],
    ['a string earnRate', { name: 'T', minSpend: 1, earnRate: '1.5' }],
    ['an unknown field', { name: 'T', minSpend: 1, earnRate: 1, id: 7 }],
  ])('returns 400 for %s', async (_label, body) => {
    await create(body).expect(400);
  });

  it('accepts the edges: minSpend 0 and 9999999999, earnRate 0.01 and 999.99', async () => {
    await create({ name: 'Low', minSpend: 0, earnRate: 0.01 }).expect(201);
    const high = await create({
      name: 'High',
      minSpend: 9_999_999_999,
      earnRate: 999.99,
    }).expect(201);
    expect(high.body).toMatchObject({
      minSpend: 9_999_999_999,
      earnRate: 999.99,
    });
  });

  it('returns 409 for a duplicate name', async () => {
    await create({
      name: 'Silver',
      minSpend: 1_000_000,
      earnRate: 1.25,
    }).expect(201);

    const res = await create({
      name: 'Silver',
      minSpend: 2_000_000,
      earnRate: 1.5,
    }).expect(409);

    expect(res.body.message).toBe('Tier name Silver is already used');
  });

  it('returns 409 for a duplicate min_spend', async () => {
    await create({
      name: 'Silver',
      minSpend: 1_000_000,
      earnRate: 1.25,
    }).expect(201);

    const res = await create({
      name: 'Platinum',
      minSpend: 1_000_000,
      earnRate: 2,
    }).expect(409);

    expect(res.body.message).toBe('A tier already starts at 1000000 VND');
    const rows = await dataSource.query('SELECT id FROM tiers');
    expect(rows).toHaveLength(1);
  });

  it('creates one tier when two with the same min_spend arrive in parallel', async () => {
    const responses = await Promise.all([
      create({ name: 'Silver', minSpend: 1_000_000, earnRate: 1.25 }),
      create({ name: 'Platinum', minSpend: 1_000_000, earnRate: 2 }),
    ]);

    expect(responses.map((res) => res.status).sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
    const rows = await dataSource.query('SELECT id FROM tiers');
    expect(rows).toHaveLength(1);
  });

  it.each([
    ['no token', undefined],
    ['a malformed token', 'Bearer nope'],
  ])('returns 401 on POST for %s', async (_label, header) => {
    const req = request(app.getHttpServer()).post('/tiers');
    if (header) req.set('Authorization', header);
    await req.send({ name: 'T', minSpend: 1, earnRate: 1 }).expect(401);
  });

  describe('PATCH /tiers/:id', () => {
    const patch = (id: number | string, body: Record<string, unknown>) =>
      request(app.getHttpServer())
        .patch(`/tiers/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    const insertTier = async (
      name: string,
      minSpend: number,
      earnRate: number,
    ): Promise<number> => {
      const result = await dataSource.query(
        `INSERT INTO tiers (name, min_spend, earn_rate) VALUES (?, ?, ?)`,
        [name, minSpend, earnRate],
      );
      return Number(result.insertId);
    };

    const stored = async (id: number) => {
      const [row] = await dataSource.query(
        `SELECT name, min_spend, earn_rate FROM tiers WHERE id = ?`,
        [id],
      );
      return {
        name: row.name,
        minSpend: Number(row.min_spend),
        earnRate: Number(row.earn_rate),
      };
    };

    it('changes every field', async () => {
      const id = await insertTier('Silver', 1_000_000, 1.25);

      const res = await patch(id, {
        name: '  Argent ',
        minSpend: 2_000_000,
        earnRate: 1.4,
      }).expect(200);

      expect(res.body).toEqual({
        id,
        name: 'Argent',
        minSpend: 2_000_000,
        earnRate: 1.4,
      });
      expect(await stored(id)).toEqual({
        name: 'Argent',
        minSpend: 2_000_000,
        earnRate: 1.4,
      });
    });

    it('keeps the fields that are not sent', async () => {
      const id = await insertTier('Silver', 1_000_000, 1.25);

      await patch(id, { earnRate: 1.5 }).expect(200);

      expect(await stored(id)).toEqual({
        name: 'Silver',
        minSpend: 1_000_000,
        earnRate: 1.5,
      });
    });

    it('accepts an empty body and changes nothing', async () => {
      const id = await insertTier('Silver', 1_000_000, 1.25);

      const res = await patch(id, {}).expect(200);

      expect(res.body).toEqual({
        id,
        name: 'Silver',
        minSpend: 1_000_000,
        earnRate: 1.25,
      });
    });

    it('lets a tier keep its own name and min_spend', async () => {
      const id = await insertTier('Silver', 1_000_000, 1.25);

      await patch(id, { name: 'Silver', minSpend: 1_000_000 }).expect(200);
    });

    it('returns 404 for an unknown id', async () => {
      await patch(999_999, { earnRate: 2 }).expect(404);
    });

    it('returns 400 when the id is not an integer', async () => {
      await patch('abc', { earnRate: 2 }).expect(400);
    });

    it.each([
      ['a blank name', { name: '   ' }],
      ['a null name', { name: null }],
      ['a name over 255 characters', { name: 'a'.repeat(256) }],
      ['a null minSpend', { minSpend: null }],
      ['a negative minSpend', { minSpend: -1 }],
      ['a fractional minSpend', { minSpend: 1.5 }],
      ['a string minSpend', { minSpend: '10' }],
      ['a minSpend over 9999999999', { minSpend: 10_000_000_000 }],
      ['a null earnRate', { earnRate: null }],
      ['a zero earnRate', { earnRate: 0 }],
      ['an earnRate over 999.99', { earnRate: 1000 }],
      ['an earnRate with 3 decimals', { earnRate: 1.234 }],
      ['a string earnRate', { earnRate: '1.5' }],
      ['an unknown field', { id: 7 }],
    ])('returns 400 for %s', async (_label, body) => {
      const id = await insertTier('Silver', 1_000_000, 1.25);

      await patch(id, body).expect(400);

      expect(await stored(id)).toEqual({
        name: 'Silver',
        minSpend: 1_000_000,
        earnRate: 1.25,
      });
    });

    it('returns 409 for a name another tier uses', async () => {
      await insertTier('Silver', 1_000_000, 1.25);
      const gold = await insertTier('Gold', 5_000_000, 1.5);

      const res = await patch(gold, { name: 'Silver' }).expect(409);

      expect(res.body.message).toBe('Tier name Silver is already used');
      expect((await stored(gold)).name).toBe('Gold');
    });

    it('returns 409 for a min_spend another tier uses', async () => {
      await insertTier('Silver', 1_000_000, 1.25);
      const gold = await insertTier('Gold', 5_000_000, 1.5);

      const res = await patch(gold, { minSpend: 1_000_000 }).expect(409);

      expect(res.body.message).toBe('A tier already starts at 1000000 VND');
      expect((await stored(gold)).minSpend).toBe(5_000_000);
    });

    it('moves two tiers to the same min_spend in parallel only once', async () => {
      const a = await insertTier('A', 100, 1);
      const b = await insertTier('B', 200, 1);

      const responses = await Promise.all([
        patch(a, { minSpend: 300 }),
        patch(b, { minSpend: 300 }),
      ]);

      expect(responses.map((res) => res.status).sort((x, y) => x - y)).toEqual([
        200, 409,
      ]);
    });

    it.each([
      ['no token', undefined],
      ['a malformed token', 'Bearer nope'],
    ])('returns 401 for %s', async (_label, header) => {
      const id = await insertTier('Silver', 1_000_000, 1.25);
      const req = request(app.getHttpServer()).patch(`/tiers/${id}`);
      if (header) req.set('Authorization', header);

      await req.send({ earnRate: 2 }).expect(401);

      expect((await stored(id)).earnRate).toBe(1.25);
    });

    it('leaves members on their tier until their next evaluation', async () => {
      const gold = await insertTier('Gold', 5_000_000, 1.5);
      const merchantId = await insertMerchant(dataSource, 'tier-key');
      await dataSource.query(
        `INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, 'a@example.com', 'A')`,
        [merchantId, gold],
      );

      await patch(gold, { minSpend: 9_000_000 }).expect(200);

      const [member] = await dataSource.query(
        `SELECT tier_id FROM members WHERE email = 'a@example.com'`,
      );
      expect(Number(member.tier_id)).toBe(gold);
    });

    it('applies a new earn rate to the next order', async () => {
      const bronze = await insertTier('Bronze', 0, 1);
      const merchantId = await insertMerchant(dataSource, 'rate-key');
      await dataSource.query(
        `INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, 'a@example.com', 'A')`,
        [merchantId, bronze],
      );
      await patch(bronze, { earnRate: 2 }).expect(200);

      await request(app.getHttpServer())
        .post('/orders')
        .set('x-api-key', 'rate-key')
        .set('Idempotency-Key', 'order-1')
        .send({ memberEmail: 'a@example.com', amount: 1_000_000 })
        .expect(201);

      const [lot] = await dataSource.query(
        `SELECT points FROM ledger_lots WHERE type = 'earn'`,
      );
      expect(Number(lot.points)).toBe(200);
    });
  });
});
