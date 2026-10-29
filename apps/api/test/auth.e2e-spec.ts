import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ADMIN_TEST_EMAIL, ADMIN_TEST_PASSWORD } from './setup-env';

describe('Auth', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  const login = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/auth/login').send(body);

  it('logs in with the right credentials and returns a token', async () => {
    const res = await login({
      email: ADMIN_TEST_EMAIL,
      password: ADMIN_TEST_PASSWORD,
    }).expect(200);

    expect(typeof res.body.accessToken).toBe('string');
    const payload = await jwt.verifyAsync(res.body.accessToken);
    expect(payload).toMatchObject({ sub: 'admin', role: 'admin' });
    expect(payload.exp - payload.iat).toBe(3600);
  });

  it('answers a wrong password and a wrong email the same way', async () => {
    const wrongPassword = await login({
      email: ADMIN_TEST_EMAIL,
      password: 'nope',
    }).expect(401);
    const wrongEmail = await login({
      email: 'someone@example.com',
      password: ADMIN_TEST_PASSWORD,
    }).expect(401);

    expect(wrongPassword.body).toEqual(wrongEmail.body);
    expect(wrongPassword.body.message).toBe('Invalid credentials');
  });

  it.each([
    ['no body', {}],
    ['no password', { email: ADMIN_TEST_EMAIL }],
    ['no email', { password: ADMIN_TEST_PASSWORD }],
    ['an empty password', { email: ADMIN_TEST_EMAIL, password: '' }],
    [
      'a password over 200 characters',
      { email: ADMIN_TEST_EMAIL, password: 'a'.repeat(201) },
    ],
    [
      'an unknown field',
      { email: ADMIN_TEST_EMAIL, password: 'x', role: 'admin' },
    ],
  ])('returns 400 for %s', async (_label, body) => {
    await login(body).expect(400);
  });
});
