import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedDemo } from '../src/seed-demo';
import { seedDemoHistory } from '../src/seed-demo-history';
import { resetDatabase } from './helpers/database';
import { ADMIN_TEST_EMAIL, ADMIN_TEST_PASSWORD } from './setup-env';

jest.setTimeout(60_000);

const API_KEY = 'demo-key-demo-key-1234';

const bootApp = async (): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
};

describe('Demo accounts', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeEach(async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_API_KEY = API_KEY;
    process.env.DEMO_ADMIN_PASSWORD = ADMIN_TEST_PASSWORD;
    app = await bootApp();
    dataSource = app.get(DataSource);
    await resetDatabase(dataSource);
    await seedDemo(dataSource, API_KEY);
    await seedDemoHistory(dataSource, API_KEY, new Date());
  });

  afterEach(async () => {
    delete process.env.DEMO_API_KEY;
    delete process.env.DEMO_ADMIN_PASSWORD;
    process.env.DEMO_MODE = 'true';
    await app.close();
  });

  it('gives the admin login and the key of every demo merchant', async () => {
    const res = await request(app.getHttpServer())
      .get('/demo/accounts')
      .expect(200);

    expect(res.body.admin).toEqual({
      email: ADMIN_TEST_EMAIL,
      password: ADMIN_TEST_PASSWORD,
    });
    expect(res.body.merchants).toHaveLength(6);
    expect(res.body.merchants[0]).toEqual({
      id: expect.any(Number),
      name: 'Tạp Hoá Cây Me',
      apiKey: API_KEY,
    });
    expect(res.body.merchants[1].apiKey).toBe(`${API_KEY}-cafe`);
  });

  it('works with the keys it hands out', async () => {
    const res = await request(app.getHttpServer()).get('/demo/accounts');
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send(res.body.admin)
      .expect(200);
    expect(typeof login.body.accessToken).toBe('string');

    await request(app.getHttpServer())
      .get('/members')
      .set('x-api-key', res.body.merchants[2].apiKey)
      .expect(200);
  });

  it('leaves out a merchant whose key is not the demo key any more', async () => {
    await dataSource.query(
      `UPDATE merchants SET api_key_hash = ? WHERE name = 'Quán Phở Gánh'`,
      ['0'.repeat(64)],
    );

    const res = await request(app.getHttpServer()).get('/demo/accounts');

    expect(res.body.merchants).toHaveLength(5);
    expect(
      res.body.merchants.map((m: { name: string }) => m.name),
    ).not.toContain('Quán Phở Gánh');
  });

  it('gives no admin login when DEMO_ADMIN_PASSWORD is not set', async () => {
    await app.close();
    delete process.env.DEMO_ADMIN_PASSWORD;
    app = await bootApp();

    const res = await request(app.getHttpServer())
      .get('/demo/accounts')
      .expect(200);

    expect(res.body.admin).toBeNull();
  });

  it('gives no merchants when DEMO_API_KEY is not set', async () => {
    await app.close();
    delete process.env.DEMO_API_KEY;
    app = await bootApp();

    const res = await request(app.getHttpServer()).get('/demo/accounts');

    expect(res.body.merchants).toEqual([]);
  });

  it('is hidden without DEMO_MODE', async () => {
    await app.close();
    delete process.env.DEMO_MODE;
    app = await bootApp();

    await request(app.getHttpServer()).get('/demo/accounts').expect(404);
  });

  it('refuses to start when DEMO_ADMIN_PASSWORD does not match the admin hash', async () => {
    await app.close();
    process.env.DEMO_ADMIN_PASSWORD = 'not-the-admin-password';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const failing = moduleRef.createNestApplication();
    await expect(failing.init()).rejects.toThrow(/DEMO_ADMIN_PASSWORD/);
    await failing.close();
    process.env.DEMO_ADMIN_PASSWORD = ADMIN_TEST_PASSWORD;
    app = await bootApp();
  });
});
