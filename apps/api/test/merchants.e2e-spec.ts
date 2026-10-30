import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { adminToken } from './helpers/admin-token';

describe('Merchants', () => {
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
    await dataSource.query('DELETE FROM redemptions');
    await dataSource.query('DELETE FROM vouchers');
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM ledger_lots');
    await dataSource.query('DELETE FROM members');
    await dataSource.query('DELETE FROM merchants');
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a merchant and returns the api key once', async () => {
    const res = await request(app.getHttpServer())
      .post('/merchants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shop A' })
      .expect(201);

    expect(res.body).toMatchObject({ name: 'Shop A' });
    expect(typeof res.body.apiKey).toBe('string');
    expect(res.body.apiKey.length).toBeGreaterThan(0);
  });

  it('stores only the sha-256 hash of the key', async () => {
    const res = await request(app.getHttpServer())
      .post('/merchants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shop A' })
      .expect(201);

    const rows = await dataSource.query(
      'SELECT api_key_hash FROM merchants WHERE id = ?',
      [res.body.id],
    );
    const expected = createHash('sha256').update(res.body.apiKey).digest('hex');
    expect(rows[0].api_key_hash).toBe(expected);
    expect(rows[0].api_key_hash).not.toBe(res.body.apiKey);
  });

  it('never exposes the key or hash when reading', async () => {
    const created = await request(app.getHttpServer())
      .post('/merchants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shop A' })
      .expect(201);

    const one = await request(app.getHttpServer())
      .get(`/merchants/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(one.body.name).toBe('Shop A');
    expect(one.body).not.toHaveProperty('apiKey');
    expect(one.body).not.toHaveProperty('apiKeyHash');

    const list = await request(app.getHttpServer())
      .get('/merchants')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).not.toHaveProperty('apiKey');
    expect(list.body[0]).not.toHaveProperty('apiKeyHash');
  });

  it.each([
    ['a missing name', {}],
    ['a blank name', { name: '   ' }],
    ['an unknown field', { name: 'Shop A', role: 'admin' }],
  ])('returns 400 for %s', async (_label, body) => {
    await request(app.getHttpServer())
      .post('/merchants')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(400);
  });

  it('returns 404 for an unknown id', async () => {
    await request(app.getHttpServer())
      .get('/merchants/999999')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it.each(['/merchants', '/merchants/1'])(
    'returns 401 for GET %s without a token',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(401);
    },
  );
});
