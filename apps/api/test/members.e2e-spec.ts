import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { resetDatabase, insertMerchant } from './helpers/database';

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
    await resetDatabase(dataSource);
    merchantId = await insertMerchant(dataSource, apiKey);
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

  describe('reads', () => {
    const otherKey = 'other-api-key';

    const createMember = async (key: string, email: string) => {
      const res = await request(app.getHttpServer())
        .post('/members')
        .set('x-api-key', key)
        .send({ name: 'John Doe', email })
        .expect(201);
      return res.body;
    };

    beforeEach(async () => {
      await insertMerchant(dataSource, otherKey, 'Shop B');
    });

    it('returns 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .get('/members/999999')
        .set('x-api-key', apiKey)
        .expect(404);
    });

    it('gets a created member by id', async () => {
      const created = await createMember(apiKey, 'john@example.com');
      const res = await request(app.getHttpServer())
        .get(`/members/${created.id}`)
        .set('x-api-key', apiKey)
        .expect(200);
      expect(res.body.email).toBe('john@example.com');
    });

    it('returns 404 for a member of another merchant', async () => {
      const created = await createMember(otherKey, 'other@example.com');
      await request(app.getHttpServer())
        .get(`/members/${created.id}`)
        .set('x-api-key', apiKey)
        .expect(404);
    });

    it('lists only the members of the calling merchant', async () => {
      await createMember(apiKey, 'mine@example.com');
      await createMember(otherKey, 'theirs@example.com');
      const res = await request(app.getHttpServer())
        .get('/members')
        .set('x-api-key', apiKey)
        .expect(200);
      expect(res.body.map((m: { email: string }) => m.email)).toEqual([
        'mine@example.com',
      ]);
    });

    it.each([
      ['no api key', undefined],
      ['an unknown api key', 'wrong-key'],
    ])('returns 401 on both reads for %s', async (_label, key) => {
      for (const path of ['/members', '/members/1']) {
        const req = request(app.getHttpServer()).get(path);
        if (key) req.set('x-api-key', key);
        await req.expect(401);
      }
    });
  });
});
