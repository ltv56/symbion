import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { adminToken } from './helpers/admin-token';
import { resetDatabase } from './helpers/database';

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
    await resetDatabase(dataSource);
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

  describe('POST /merchants/:id/api-key', () => {
    const createMerchant = async (): Promise<{
      id: number;
      apiKey: string;
    }> => {
      const res = await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Shop A' })
        .expect(201);
      return res.body;
    };

    const rotate = (id: number, auth: string | null = `Bearer ${token}`) => {
      const req = request(app.getHttpServer()).post(`/merchants/${id}/api-key`);
      if (auth) req.set('Authorization', auth);
      return req.send();
    };

    const membersWith = (apiKey: string) =>
      request(app.getHttpServer()).get('/members').set('x-api-key', apiKey);

    it('returns a new key once and the old key stops working', async () => {
      const { id, apiKey: oldKey } = await createMerchant();

      const res = await rotate(id).expect(200);

      expect(res.body).toMatchObject({ id, name: 'Shop A' });
      expect(res.body.apiKey).toMatch(/^[0-9a-f]{64}$/);
      expect(res.body.apiKey).not.toBe(oldKey);
      await membersWith(oldKey).expect(401);
      await membersWith(res.body.apiKey).expect(200);
    });

    it('stores only the hash of the new key', async () => {
      const { id } = await createMerchant();

      const res = await rotate(id).expect(200);

      const [row] = await dataSource.query(
        'SELECT api_key_hash FROM merchants WHERE id = ?',
        [id],
      );
      expect(row.api_key_hash).toBe(
        createHash('sha256').update(res.body.apiKey).digest('hex'),
      );
    });

    it('returns 404 for an unknown merchant', async () => {
      await rotate(999_999).expect(404);
    });

    it('returns 401 without a token and keeps the key', async () => {
      const { id, apiKey } = await createMerchant();

      await rotate(id, null).expect(401);

      await membersWith(apiKey).expect(200);
    });

    it('returns 401 for a merchant api key instead of a token', async () => {
      const { id, apiKey } = await createMerchant();

      await request(app.getHttpServer())
        .post(`/merchants/${id}/api-key`)
        .set('x-api-key', apiKey)
        .expect(401);
    });
  });
});
