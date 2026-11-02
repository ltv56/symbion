import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Request id', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('generates an id when the client sends none', async () => {
    const res = await request(app.getHttpServer()).get('/health');

    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('echoes a safe id sent by the client', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'trace-abc_123');

    expect(res.headers['x-request-id']).toBe('trace-abc_123');
  });

  it('replaces an id with unsafe characters or too long', async () => {
    const tooLong = await request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'a'.repeat(200));
    const spaces = await request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'bad id with spaces');

    expect(tooLong.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(spaces.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('logs one access line per request with method, path, status and no query', async () => {
    const lines: string[] = [];
    jest.spyOn(Logger.prototype, 'log').mockImplementation((message) => {
      lines.push(String(message));
    });

    await request(app.getHttpServer()).get('/health?token=secret');

    const access = lines.find((l) => l.startsWith('GET /health'));
    expect(access).toMatch(/^GET \/health 200 \d+ms$/);
    expect(lines.join('\n')).not.toContain('secret');
  });
});
