import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedTiers } from '../src/seed';
import { adminToken } from './helpers/admin-token';
import { resetDatabase } from './helpers/database';
import { memberToken } from './helpers/member-token';

// One member through the whole programme, only through the HTTP API.
describe('Full loop', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    await resetDatabase(dataSource);
    await seedTiers(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('order -> points -> tier -> redeem -> confirm -> refund -> negative balance', async () => {
    const server = app.getHttpServer();
    const admin = `Bearer ${await adminToken(app)}`;
    const email = 'loop@example.com';

    // Admin onboards two merchants
    const createMerchant = async (name: string) =>
      (
        await request(server)
          .post('/merchants')
          .set('Authorization', admin)
          .send({ name })
          .expect(201)
      ).body as { id: number; apiKey: string };
    const shopA = await createMerchant('Shop A');
    const shopB = await createMerchant('Shop B');

    // Shop A registers the member and sends an order of 5,000,000
    await request(server)
      .post('/members')
      .set('x-api-key', shopA.apiKey)
      .send({ name: 'Loop', email })
      .expect(201);
    const { body: order } = await request(server)
      .post('/orders')
      .set('x-api-key', shopA.apiKey)
      .set('Idempotency-Key', 'loop-order')
      .send({ memberEmail: email, amount: 5_000_000 })
      .expect(201);

    // Member logs in: 500 points at Bronze, now Gold
    const member = `Bearer ${await memberToken(app, email)}`;
    const me = () =>
      request(server).get('/me').set('Authorization', member).expect(200);
    expect((await me()).body).toMatchObject({
      balance: 500,
      tier: { name: 'Gold' },
    });

    // Admin creates Shop B's voucher; the member redeems it
    const { body: voucher } = await request(server)
      .post('/vouchers')
      .set('Authorization', admin)
      .send({
        merchantId: shopB.id,
        title: 'Coffee',
        faceValue: 50_000,
        pointsPrice: 500,
        stock: 5,
        validUntil: new Date(
          Math.floor(Date.now() / 1000) * 1000 + 7 * 86_400_000,
        ).toISOString(),
      })
      .expect(201);
    const redeem = (key: string) =>
      request(server)
        .post('/me/redemptions')
        .set('Authorization', member)
        .set('Idempotency-Key', key)
        .send({ voucherId: voucher.id });
    const { body: redemption } = await redeem('loop-r1').expect(201);
    expect((await me()).body.balance).toBe(0);

    // Shop B confirms the code at the counter
    await request(server)
      .post(`/redemptions/${redemption.code}/confirm`)
      .set('x-api-key', shopB.apiKey)
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('used'));

    // Shop A refunds the whole order after the points were spent
    const { body: refund } = await request(server)
      .post(`/orders/${order.id}/refunds`)
      .set('x-api-key', shopA.apiKey)
      .set('Idempotency-Key', 'loop-refund')
      .send({ amount: 5_000_000 })
      .expect(201);
    expect(refund.pointsDeducted).toBe(500);
    expect((await me()).body).toMatchObject({
      balance: -500,
      tier: { name: 'Bronze' },
    });

    // A negative balance blocks redemption
    await redeem('loop-r2').expect(409);

    const { body: history } = await request(server)
      .get('/me/history')
      .set('Authorization', member)
      .expect(200);
    expect(
      history.map((entry: { type: string; points: number }) => [
        entry.type,
        entry.points,
      ]),
    ).toEqual([
      ['spend', -500],
      ['spend', -500],
      ['earn', 500],
    ]);
  });
});
