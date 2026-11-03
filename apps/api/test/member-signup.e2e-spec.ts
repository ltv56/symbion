import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { MailService, type MailMessage } from '../src/mail/mail.service';
import { insertMerchant, resetDatabase } from './helpers/database';

describe('Member sign-up', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let sent: MailMessage[];
  let failMail = false;
  const email = 'new@example.com';

  const bootApp = async (): Promise<INestApplication> => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue({
        send: (message: MailMessage) => {
          if (failMail) return Promise.reject(new Error('smtp down'));
          sent.push(message);
          return Promise.resolve();
        },
      })
      .compile();
    const created = moduleRef.createNestApplication();
    await created.init();
    return created;
  };

  beforeAll(async () => {
    app = await bootApp();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    sent = [];
    failMail = false;
    await dataSource.query(
      `INSERT INTO tiers (name, min_spend, earn_rate) VALUES ('Silver', 1000000, 1.25), ('Bronze', 0, 1.00)`,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const signup = (body: object = { email, name: 'New Member' }) =>
    request(app.getHttpServer()).post('/auth/member/signup').send(body);
  const confirm = (otp: string, who = email) =>
    request(app.getHttpServer())
      .post('/auth/member/signup/confirm')
      .send({ email: who, otp });
  const members = () =>
    dataSource.query(
      `SELECT m.email, m.name, t.name AS tier, mc.name AS merchant
      FROM members m JOIN tiers t ON t.id = m.tier_id JOIN merchants mc ON mc.id = m.merchant_id`,
    );
  const signups = () => dataSource.query(`SELECT * FROM member_signups`);

  it('emails the code and creates no member until it is confirmed', async () => {
    const res = await signup().expect(200);

    expect(res.body.otp).toMatch(/^\d{6}$/);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe(email);
    expect(sent[0]?.text).toContain(res.body.otp);
    expect(await members()).toEqual([]);
    expect(await signups()).toHaveLength(1);
  });

  it('confirming creates the member on the lowest tier under Symbion and signs them in', async () => {
    const { body } = await signup().expect(200);

    const res = await confirm(body.otp).expect(201);

    expect(await members()).toEqual([
      { email, name: 'New Member', tier: 'Bronze', merchant: 'Symbion' },
    ]);
    expect(await signups()).toEqual([]);
    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);
    expect(me.body.email).toBe(email);
  });

  it('reuses the Symbion merchant for the next sign-up', async () => {
    const first = await signup().expect(200);
    await confirm(first.body.otp).expect(201);
    const second = await signup({ email: 'two@example.com', name: 'Two' });
    await confirm(second.body.otp, 'two@example.com').expect(201);

    const [row] = await dataSource.query(
      `SELECT COUNT(*) AS n FROM merchants WHERE name = 'Symbion'`,
    );
    expect(Number(row.n)).toBe(1);
  });

  it('rejects a wrong code, and deletes the sign-up after 5 wrong codes', async () => {
    const { body } = await signup().expect(200);
    const wrong = body.otp === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i++) {
      await confirm(wrong).expect(401);
    }

    expect(await signups()).toEqual([]);
    await confirm(body.otp).expect(401);
    expect(await members()).toEqual([]);
  });

  it('rejects an expired code', async () => {
    const { body } = await signup().expect(200);
    await dataSource.query(
      `UPDATE member_signups SET expires_at = NOW() - INTERVAL 1 MINUTE`,
    );

    await confirm(body.otp).expect(401);

    expect(await members()).toEqual([]);
  });

  it('answers 200 and sends nothing when the email is already a member', async () => {
    const first = await signup().expect(200);
    await confirm(first.body.otp).expect(201);
    sent = [];

    const res = await signup().expect(200);

    expect(res.body).toEqual({});
    expect(sent).toEqual([]);
    expect(await signups()).toEqual([]);
  });

  it('answers 429 when a code was sent in the last 30 seconds', async () => {
    await signup().expect(200);

    await signup().expect(429);

    expect(sent).toHaveLength(1);
  });

  it('a new code after the pause replaces the old one', async () => {
    const first = await signup().expect(200);
    await dataSource.query(
      `UPDATE member_signups SET created_at = NOW() - INTERVAL 1 MINUTE`,
    );
    const second = await signup().expect(200);

    expect(await signups()).toHaveLength(1);
    if (first.body.otp !== second.body.otp) {
      await confirm(first.body.otp).expect(401);
    }
    await confirm(second.body.otp).expect(201);
  });

  it('signs in the existing member when the email became a member meanwhile', async () => {
    const { body } = await signup().expect(200);
    const merchantId = await insertMerchant(dataSource, 'other-key');
    await dataSource.query(
      `INSERT INTO members (merchant_id, tier_id, email, name)
      SELECT ?, id, ?, 'Early' FROM tiers LIMIT 1`,
      [merchantId, email],
    );

    const res = await confirm(body.otp).expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(await members()).toHaveLength(1);
  });

  it('still answers 200 when the mail cannot be sent', async () => {
    failMail = true;

    await signup().expect(200);

    expect(await signups()).toHaveLength(1);
  });

  it.each([
    ['no email', { name: 'A' }],
    ['a bad email', { email: 'nope', name: 'A' }],
    ['no name', { email }],
    ['an empty name', { email, name: '  ' }],
    ['a name over 255 characters', { email, name: 'n'.repeat(256) }],
  ])('rejects %s with 400', async (_label, body) => {
    await signup(body).expect(400);

    expect(sent).toEqual([]);
  });

  it('emails the code of a normal sign-in too', async () => {
    const first = await signup().expect(200);
    await confirm(first.body.otp).expect(201);
    sent = [];

    const res = await request(app.getHttpServer())
      .post('/auth/member/otp')
      .send({ email })
      .expect(200);

    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain(res.body.otp);
  });

  describe('one form for signing in and signing up', () => {
    const requestOtp = (who = email) =>
      request(app.getHttpServer())
        .post('/auth/member/otp')
        .send({ email: who });
    const login = (otp: string, name?: string, who = email) =>
      request(app.getHttpServer())
        .post('/auth/member/login')
        .send({ email: who, otp, ...(name === undefined ? {} : { name }) });

    it('a new email gets a code, and the right code alone creates nobody and asks for a name', async () => {
      const first = await requestOtp().expect(200);

      expect(first.body.otp).toMatch(/^\d{6}$/);
      expect(sent).toHaveLength(1);

      const res = await login(first.body.otp).expect(200);

      expect(res.body).toEqual({ needName: true });
      expect(await members()).toEqual([]);
      expect(await signups()).toHaveLength(1);
    });

    it('the same code with a name creates the member under that name and signs them in', async () => {
      const first = await requestOtp().expect(200);
      await login(first.body.otp).expect(200);

      const res = await login(first.body.otp, '  Minh Anh  ').expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.needName).toBeUndefined();
      expect(await members()).toEqual([
        { email, name: 'Minh Anh', tier: 'Bronze', merchant: 'Symbion' },
      ]);
      expect(await signups()).toEqual([]);
      await login(first.body.otp, 'Again').expect(401);
    });

    it('a wrong code with a name creates nobody', async () => {
      const first = await requestOtp().expect(200);
      const wrong = first.body.otp === '000000' ? '111111' : '000000';

      await login(wrong, 'Minh Anh').expect(401);

      expect(await members()).toEqual([]);
    });

    it('asking for the name leaves the code time to type it', async () => {
      const first = await requestOtp().expect(200);
      await dataSource.query(
        `UPDATE member_signups SET expires_at = NOW() + INTERVAL 1 MINUTE`,
      );

      await login(first.body.otp).expect(200);

      const [row] = await dataSource.query(
        `SELECT TIMESTAMPDIFF(MINUTE, NOW(), expires_at) AS minutes FROM member_signups`,
      );
      expect(Number(row.minutes)).toBeGreaterThanOrEqual(8);
    });

    it('a member signs in with the code alone, and a name changes nothing', async () => {
      const created = await requestOtp().expect(200);
      await login(created.body.otp, 'Minh Anh').expect(200);
      sent = [];

      const again = await requestOtp().expect(200);
      const res = await login(again.body.otp, 'Someone Else').expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(sent).toHaveLength(1);
      expect(await members()).toEqual([
        { email, name: 'Minh Anh', tier: 'Bronze', merchant: 'Symbion' },
      ]);
    });

    it.each([
      ['an empty name', '   '],
      ['a name over 255 characters', 'n'.repeat(256)],
    ])('rejects %s with 400', async (_label, name) => {
      const first = await requestOtp().expect(200);

      await login(first.body.otp, name).expect(400);
    });

    it('asks for a new code of a new email again only after 30 seconds', async () => {
      await requestOtp().expect(200);

      await requestOtp().expect(429);

      expect(sent).toHaveLength(1);
    });

    it('asking again for a pending sign-up sends a new code', async () => {
      await requestOtp().expect(200);
      await dataSource.query(
        `UPDATE member_signups SET created_at = NOW() - INTERVAL 1 MINUTE`,
      );
      sent = [];

      const again = await requestOtp().expect(200);

      expect(sent).toHaveLength(1);
      await login(again.body.otp, 'Minh Anh').expect(200);
    });
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

    it('does not return the code', async () => {
      const res = await request(plainApp.getHttpServer())
        .post('/auth/member/signup')
        .send({ email, name: 'New Member' })
        .expect(200);

      expect(res.body).toEqual({});
      expect(sent).toHaveLength(1);
    });
  });
});
