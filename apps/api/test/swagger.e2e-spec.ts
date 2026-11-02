import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupSwagger } from '../src/swagger';

describe('Swagger', () => {
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

  it('serves the OpenAPI document', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    expect(res.body.openapi).toBeDefined();
    expect(res.body.paths['/members']).toBeDefined();
  });

  it('documents both the created and the replayed order responses', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    const responses = res.body.paths['/orders'].post.responses;
    expect(Object.keys(responses)).toEqual(
      expect.arrayContaining(['200', '201']),
    );
  });
});
