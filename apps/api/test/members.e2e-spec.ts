import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('Members', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let merchantId: number;
  const apiKey = 'test-api-key';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM members');
    await dataSource.query('DELETE FROM tiers');
    await dataSource.query('DELETE FROM merchants');
    const merchant = await dataSource.query(
      `INSERT INTO merchants (name, api_key_hash) VALUES ('Shop A', ?)`,
      [createHash('sha256').update(apiKey).digest('hex')],
    );
    merchantId = Number(merchant.insertId);
    await dataSource.query(
      `INSERT INTO tiers (name, min_points, earn_rate) VALUES ('Silver', 1000, 1.50), ('Bronze', 0, 1.00)`,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a member on the lowest tier', async () => {
    const res = await request(app.getHttpServer())
      .post('/members')
      .set('x-api-key', apiKey)
      .send({ name: 'John Doe', email: 'john@example.com' })
      .expect(201);

    expect(res.body).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com',
      merchantId,
    });
    const rows = await dataSource.query(
      `SELECT t.name FROM members m JOIN tiers t ON t.id = m.tier_id WHERE m.id = ?`,
      [res.body.id],
    );
    expect(rows[0].name).toBe('Bronze');
  });

  it('returns 503 with a clear message when no tiers are configured', async () => {
    await dataSource.query('DELETE FROM tiers');

    const res = await request(app.getHttpServer())
      .post('/members')
      .set('x-api-key', apiKey)
      .send({ name: 'John Doe', email: 'john@example.com' })
      .expect(503);

    expect(res.body.message).toBe('No tiers configured');
  });

  it('returns 409 for a duplicate email', async () => {
    const body = { name: 'John Doe', email: 'john@example.com' };
    await request(app.getHttpServer())
      .post('/members')
      .set('x-api-key', apiKey)
      .send(body)
      .expect(201);
    const res = await request(app.getHttpServer())
      .post('/members')
      .set('x-api-key', apiKey)
      .send(body)
      .expect(409);
    expect(res.body).toEqual({
      statusCode: 409,
      error: 'Conflict',
      message: 'Email john@example.com is already registered',
    });
  });

  it('returns 400 when a field is missing', async () => {
    await request(app.getHttpServer())
      .post('/members')
      .set('x-api-key', apiKey)
      .send({ name: 'John Doe' })
      .expect(400);
  });

  it.each([
    ['an invalid email', { name: 'John Doe', email: 'not-an-email' }],
    ['a blank name', { name: '   ', email: 'john@example.com' }],
    [
      'a merchantId in the body',
      { name: 'John Doe', email: 'j@example.com', merchantId: 1 },
    ],
    [
      'an unknown field',
      { name: 'John Doe', email: 'j@example.com', role: 'admin' },
    ],
  ])('returns 400 for %s', async (_label, extra) => {
    await request(app.getHttpServer())
      .post('/members')
      .set('x-api-key', apiKey)
      .send(extra)
      .expect(400);
  });

  it.each([
    ['no api key', undefined],
    ['an unknown api key', 'wrong-key'],
  ])('returns 401 for %s', async (_label, key) => {
    const req = request(app.getHttpServer()).post('/members');
    if (key) req.set('x-api-key', key);
    await req.send({ name: 'John Doe', email: 'john@example.com' }).expect(401);
  });

  it('returns 404 for an unknown id', async () => {
    await request(app.getHttpServer()).get('/members/999999').expect(404);
  });

  it('gets a created member by id', async () => {
    const created = await request(app.getHttpServer())
      .post('/members')
      .set('x-api-key', apiKey)
      .send({ name: 'John Doe', email: 'john@example.com' })
      .expect(201);
    const res = await request(app.getHttpServer())
      .get(`/members/${created.body.id}`)
      .expect(200);
    expect(res.body.email).toBe('john@example.com');
  });
});
