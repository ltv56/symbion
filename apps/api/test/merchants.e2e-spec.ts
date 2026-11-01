import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { adminToken } from './helpers/admin-token';
import { insertMerchant, resetDatabase } from './helpers/database';

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

  describe('PATCH /merchants/:id', () => {
    let merchantId: number;

    beforeEach(async () => {
      merchantId = await insertMerchant(dataSource, 'patch-key');
    });

    const patch = (
      body: Record<string, unknown>,
      id: number | string = merchantId,
    ) =>
      request(app.getHttpServer())
        .patch(`/merchants/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    const row = async () => {
      const [found] = await dataSource.query(
        'SELECT name, photo_url, address FROM merchants WHERE id = ?',
        [merchantId],
      );
      return found;
    };

    it('starts without a photo or address', async () => {
      const res = await request(app.getHttpServer())
        .get(`/merchants/${merchantId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({ photoUrl: null, address: null });
    });

    it('sets the photo url and the trimmed address', async () => {
      const res = await patch({
        photoUrl: 'https://cdn.example.com/shop.jpg',
        address: '  12 Nguyen Hue, District 1 ',
      }).expect(200);

      expect(res.body).toEqual({
        id: merchantId,
        name: 'Shop A',
        photoUrl: 'https://cdn.example.com/shop.jpg',
        address: '12 Nguyen Hue, District 1',
        createdAt: expect.any(String),
      });
      expect(await row()).toEqual({
        name: 'Shop A',
        photo_url: 'https://cdn.example.com/shop.jpg',
        address: '12 Nguyen Hue, District 1',
      });
      const one = await request(app.getHttpServer())
        .get(`/merchants/${merchantId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(one.body.address).toBe('12 Nguyen Hue, District 1');
    });

    it('keeps a field that is not in the body', async () => {
      await patch({ photoUrl: 'https://cdn.example.com/shop.jpg' }).expect(200);

      await patch({ address: '12 Nguyen Hue' }).expect(200);

      expect(await row()).toMatchObject({
        photo_url: 'https://cdn.example.com/shop.jpg',
        address: '12 Nguyen Hue',
      });
    });

    it('clears a field set to null', async () => {
      await patch({
        photoUrl: 'https://cdn.example.com/shop.jpg',
        address: '12 Nguyen Hue',
      }).expect(200);

      const res = await patch({ photoUrl: null }).expect(200);

      expect(res.body).toMatchObject({
        photoUrl: null,
        address: '12 Nguyen Hue',
      });
      expect(await row()).toMatchObject({
        photo_url: null,
        address: '12 Nguyen Hue',
      });
    });

    it('accepts an empty body and changes nothing', async () => {
      await patch({ address: '12 Nguyen Hue' }).expect(200);

      const res = await patch({}).expect(200);

      expect(res.body).toMatchObject({
        id: merchantId,
        address: '12 Nguyen Hue',
      });
    });

    it('never exposes the key or hash', async () => {
      const res = await patch({ address: '12 Nguyen Hue' }).expect(200);

      expect(res.body).not.toHaveProperty('apiKeyHash');
    });

    it('returns 404 for an unknown merchant', async () => {
      await patch({ address: 'x' }, 999_999).expect(404);
    });

    it.each([
      ['an ftp url', { photoUrl: 'ftp://cdn.example.com/shop.jpg' }],
      ['a javascript url', { photoUrl: 'javascript:alert(1)' }],
      ['a url without a protocol', { photoUrl: 'cdn.example.com/shop.jpg' }],
      ['a numeric url', { photoUrl: 5 }],
      [
        'a url over 2048 characters',
        { photoUrl: `https://example.com/${'a'.repeat(2030)}` },
      ],
      ['a blank address', { address: '   ' }],
      ['an address over 255 characters', { address: 'a'.repeat(256) }],
      ['a numeric address', { address: 5 }],
      ['a name field', { name: 'Shop B' }],
    ])('returns 400 for %s', async (_label, body) => {
      await patch(body).expect(400);

      expect(await row()).toEqual({
        name: 'Shop A',
        photo_url: null,
        address: null,
      });
    });

    it.each([
      ['no token', undefined],
      ['a malformed token', 'Bearer nope'],
    ])('returns 401 for %s', async (_label, header) => {
      const req = request(app.getHttpServer()).patch(
        `/merchants/${merchantId}`,
      );
      if (header) req.set('Authorization', header);
      await req.send({ address: 'x' }).expect(401);
    });

    it('returns 401 for a merchant api key instead of a token', async () => {
      await request(app.getHttpServer())
        .patch(`/merchants/${merchantId}`)
        .set('x-api-key', 'patch-key')
        .send({ address: 'x' })
        .expect(401);
    });
  });
});
