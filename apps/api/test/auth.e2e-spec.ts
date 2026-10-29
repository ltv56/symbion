import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { adminToken } from './helpers/admin-token';
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

  describe('AdminGuard on POST /merchants', () => {
    const create = () =>
      request(app.getHttpServer()).post('/merchants').send({ name: 'Shop A' });

    it('returns 401 without a token', async () => {
      await create().expect(401);
    });

    it('returns 401 for a malformed token', async () => {
      await create().set('Authorization', 'Bearer not-a-jwt').expect(401);
    });

    it('returns 401 for a scheme other than Bearer', async () => {
      const token = await adminToken(app);
      await create().set('Authorization', `Basic ${token}`).expect(401);
    });

    it('returns 401 for a token signed with another secret', async () => {
      const forged = await new JwtService({ secret: 'x'.repeat(40) }).signAsync(
        { sub: 'admin', role: 'admin' },
      );
      await create().set('Authorization', `Bearer ${forged}`).expect(401);
    });

    it('returns 401 for an expired token', async () => {
      const expired = await jwt.signAsync(
        { sub: 'admin', role: 'admin' },
        { expiresIn: -10 },
      );
      await create().set('Authorization', `Bearer ${expired}`).expect(401);
    });

    it('returns 401 for a valid token without the admin role', async () => {
      const member = await jwt.signAsync({ sub: '1', role: 'member' });
      await create().set('Authorization', `Bearer ${member}`).expect(401);
    });

    it('lets an admin token through', async () => {
      const token = await adminToken(app);
      await create().set('Authorization', `Bearer ${token}`).expect(201);
    });
  });
});
