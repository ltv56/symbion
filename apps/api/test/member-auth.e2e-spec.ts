import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { insertMerchant, resetDatabase } from './helpers/database';

const bootApp = async (): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
};

describe('Member auth', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let memberId: number;
  const email = 'john@example.com';

  beforeAll(async () => {
    app = await bootApp();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    const merchantId = await insertMerchant(dataSource, 'test-api-key');
    const tier = await dataSource.query(
      `INSERT INTO tiers (name, min_points, earn_rate) VALUES ('Bronze', 0, 1.00)`,
    );
    const member = await dataSource.query(
      `INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, ?, 'John')`,
      [merchantId, Number(tier.insertId), email],
    );
    memberId = Number(member.insertId);
  });

  afterAll(async () => {
    await app.close();
  });

  const requestOtp = (body: object) =>
    request(app.getHttpServer()).post('/auth/member/otp').send(body);

  const login = (body: object) =>
    request(app.getHttpServer()).post('/auth/member/login').send(body);

  const newOtp = async (): Promise<string> => {
    const res = await requestOtp({ email }).expect(200);
    return res.body.otp;
  };

  const otpRows = (): Promise<{ code_hash: string; attempts: number }[]> =>
    dataSource.query(
      'SELECT code_hash, attempts FROM member_otps WHERE member_id = ?',
      [memberId],
    );

  it('returns a 6 digit otp in demo mode and stores only its hash', async () => {
    const otp = await newOtp();

    expect(otp).toMatch(/^\d{6}$/);
    const rows = await otpRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0]?.code_hash).not.toContain(otp);
  });

  it('logs in with the otp and returns a member token', async () => {
    const otp = await newOtp();

    const res = await login({ email, otp }).expect(200);

    const payload = await app.get(JwtService).verifyAsync(res.body.accessToken);
    expect(payload).toMatchObject({ sub: String(memberId), role: 'member' });
  });

  it('accepts the email in another case', async () => {
    const otp = await newOtp();

    await login({ email: email.toUpperCase(), otp }).expect(200);
  });

  it('accepts an otp only once', async () => {
    const otp = await newOtp();

    await login({ email, otp }).expect(200);
    await login({ email, otp }).expect(401);
  });

  it('logs in once when the same otp arrives in parallel', async () => {
    const otp = await newOtp();

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => login({ email, otp })),
    );

    expect(responses.map((res) => res.status).sort((a, b) => a - b)).toEqual([
      200, 401, 401, 401, 401,
    ]);
  });

  it('counts a wrong otp and still accepts the right one', async () => {
    const otp = await newOtp();
    const wrong = otp === '000000' ? '111111' : '000000';

    const res = await login({ email, otp: wrong }).expect(401);

    expect(res.body.message).toBe('Invalid or expired code');
    await expect(otpRows()).resolves.toMatchObject([{ attempts: 1 }]);
    await login({ email, otp }).expect(200);
  });

  it('drops the otp after 5 wrong attempts', async () => {
    const otp = await newOtp();
    const wrong = otp === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i++) {
      await login({ email, otp: wrong }).expect(401);
    }

    await expect(otpRows()).resolves.toHaveLength(0);
    await login({ email, otp }).expect(401);
  });

  it('rejects an expired otp', async () => {
    const otp = await newOtp();
    await dataSource.query(
      'UPDATE member_otps SET expires_at = ? WHERE member_id = ?',
      [new Date(Date.now() - 1000), memberId],
    );

    await login({ email, otp }).expect(401);
  });

  it('expires 5 minutes after it is sent', async () => {
    const before = Date.now();
    await newOtp();

    const [row]: { expires_at: Date }[] = await dataSource.query(
      'SELECT expires_at FROM member_otps WHERE member_id = ?',
      [memberId],
    );
    const lifetime = row!.expires_at.getTime() - before;
    expect(lifetime).toBeGreaterThan(299_000);
    // request latency slack
    expect(lifetime).toBeLessThanOrEqual(310_000);
  });

  it('replaces the previous otp when a new one is requested', async () => {
    const first = await newOtp();
    let second = await newOtp();
    while (second === first) second = await newOtp();

    await login({ email, otp: first }).expect(401);
    await login({ email, otp: second }).expect(200);
  });

  it('answers an unknown email like a known one, without an otp', async () => {
    const res = await requestOtp({ email: 'nobody@example.com' }).expect(200);

    expect(res.body).toEqual({});
    await login({ email: 'nobody@example.com', otp: '123456' }).expect(401);
  });

  it.each([
    ['an invalid email', '/auth/member/otp', { email: 'nope' }],
    ['a 5 digit otp', '/auth/member/login', { email, otp: '12345' }],
    ['a non-digit otp', '/auth/member/login', { email, otp: '12345a' }],
    ['an otp as a number', '/auth/member/login', { email, otp: 123456 }],
  ])('returns 400 for %s', async (_label, path, body) => {
    await request(app.getHttpServer()).post(path).send(body).expect(400);
  });

  it('does not accept a member token on admin endpoints', async () => {
    const otp = await newOtp();
    const { body } = await login({ email, otp }).expect(200);

    await request(app.getHttpServer())
      .get('/merchants')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(401);
  });

  describe('without DEMO_MODE', () => {
    let plainApp: INestApplication;

    beforeAll(async () => {
      delete process.env.DEMO_MODE;
      plainApp = await bootApp();
    });

    afterAll(async () => {
      process.env.DEMO_MODE = 'true';
      await plainApp.close();
    });

    it('does not return the otp', async () => {
      const res = await request(plainApp.getHttpServer())
        .post('/auth/member/otp')
        .send({ email })
        .expect(200);

      expect(res.body).toEqual({});
      await expect(otpRows()).resolves.toHaveLength(1);
    });
  });
});
