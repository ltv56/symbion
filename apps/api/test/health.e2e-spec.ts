import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setupSwagger } from '../src/swagger';

describe('Health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns ok without an api key when MySQL answers', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 503 in the common error shape when MySQL is down', async () => {
    jest
      .spyOn(app.get(DataSource), 'query')
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED 10.0.0.5:3306'));

    const res = await request(app.getHttpServer()).get('/health').expect(503);
    expect(res.body).toEqual({
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Database unavailable',
    });
    expect(JSON.stringify(res.body)).not.toContain('ECONNREFUSED');
  });

  it('is documented in Swagger with both responses', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    const responses = res.body.paths['/health'].get.responses;
    expect(Object.keys(responses)).toEqual(
      expect.arrayContaining(['200', '503']),
    );
  });
});
