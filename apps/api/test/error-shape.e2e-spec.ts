import { createHash } from 'node:crypto';
import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { MembersService } from '../src/members/members.service';

describe('Error shape', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const apiKey = 'test-api-key';
  const sqlLeak = 'SELECT secret FROM vault';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MembersService)
      .useValue({
        findOne: (id: number) => {
          if (id === 500) throw new Error(sqlLeak);
          return Promise.resolve(null);
        },
        create: jest.fn(),
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM ledger_lots');
    await dataSource.query('DELETE FROM members');
    await dataSource.query('DELETE FROM tiers');
    await dataSource.query('DELETE FROM merchants');
    await dataSource.query(
      `INSERT INTO merchants (name, api_key_hash) VALUES ('Shop A', ?)`,
      [createHash('sha256').update(apiKey).digest('hex')],
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const expectShape = (body: Record<string, unknown>, status: number) => {
    expect(body).toMatchObject({
      statusCode: status,
      error: expect.any(String),
      message: expect.any(String),
    });
    const allowed = ['statusCode', 'error', 'message', 'details'];
    expect(Object.keys(body).every((key) => allowed.includes(key))).toBe(true);
  };

  it('returns the shape with details for a validation error', async () => {
    const res = await request(app.getHttpServer())
      .post('/members')
      .set('x-api-key', apiKey)
      .send({ name: 'John Doe', email: 'not-an-email' })
      .expect(400);

    expectShape(res.body, 400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.any(String)]),
    );
  });

  it('returns the shape for a missing api key', async () => {
    const res = await request(app.getHttpServer())
      .post('/members')
      .send({ name: 'John Doe', email: 'john@example.com' })
      .expect(401);

    expectShape(res.body, 401);
  });

  it('returns the shape for an unknown id', async () => {
    const res = await request(app.getHttpServer())
      .get('/members/999999')
      .expect(404);

    expectShape(res.body, 404);
  });

  it('returns the shape for an unknown route', async () => {
    const res = await request(app.getHttpServer()).get('/nope').expect(404);

    expectShape(res.body, 404);
  });

  it('hides internals of an unexpected error', async () => {
    const res = await request(app.getHttpServer())
      .get('/members/500')
      .expect(500);

    expectShape(res.body, 500);
    expect(res.body.message).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toContain(sqlLeak);
    expect(JSON.stringify(res.body)).not.toContain('at ');
  });

  it('does not log the api key of a rejected request', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await request(app.getHttpServer())
      .post('/members')
      .set('x-api-key', 'leaky-key')
      .send({ name: 'John Doe', email: 'john@example.com' })
      .expect(401);

    const logged = JSON.stringify([...warn.mock.calls, ...error.mock.calls]);
    expect(warn).toHaveBeenCalled();
    expect(logged).not.toContain('leaky-key');
    warn.mockRestore();
    error.mockRestore();
  });
});
