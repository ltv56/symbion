import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { adminToken } from './helpers/admin-token';
import { insertMerchant, resetDatabase } from './helpers/database';

const bootApp = async (): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
};

describe.each([
  { limits: true, valueStatus: 400, rotateStatus: 403 },
  { limits: false, valueStatus: 200, rotateStatus: 200 },
])('Admin limits with DEMO_ADMIN_LIMITS on=$limits', (expected) => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let merchantId: number;

  beforeAll(async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_ADMIN_LIMITS = expected.limits ? 'true' : 'false';
    app = await bootApp();
    dataSource = app.get(DataSource);
    token = await adminToken(app);
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    await dataSource.query(
      `UPDATE program_settings SET point_value_vnd = 100 WHERE id = 1`,
    );
    merchantId = await insertMerchant(dataSource, 'test-api-key');
  });

  afterAll(async () => {
    process.env.DEMO_ADMIN_LIMITS = 'false';
    await app.close();
  });

  const patchValue = (pointValueVnd: number) =>
    request(app.getHttpServer())
      .patch('/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ pointValueVnd });

  it('limits the point value outside 50-200 only when the limits are on', async () => {
    const res = await patchValue(5000);

    expect(res.status).toBe(expected.valueStatus);
  });

  it('keeps a point value inside 50-200 allowed', async () => {
    const res = await patchValue(150);

    expect(res.status).toBe(200);
    expect(res.body.pointValueVnd).toBe(150);
  });

  it('blocks key rotation only when the limits are on', async () => {
    const res = await request(app.getHttpServer())
      .post(`/merchants/${merchantId}/api-key`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(expected.rotateStatus);
  });
});
