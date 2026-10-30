import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { adminToken } from './helpers/admin-token';
import { resetDatabase } from './helpers/database';

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
});
