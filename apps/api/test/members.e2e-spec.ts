import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('Members', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let merchantId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM members');
    await dataSource.query('DELETE FROM tiers');
    await dataSource.query('DELETE FROM merchants');
    const merchant = await dataSource.query(
      `INSERT INTO merchants (name, api_key_hash) VALUES ('Shop A', REPEAT('a', 64))`,
    );
    merchantId = Number(merchant.insertId);
    await dataSource.query(
      `INSERT INTO tiers (name, min_points, earn_rate) VALUES ('Silver', 1000, 1.50), ('Bronze', 0, 1.00)`,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a member on the lowest tier', async () => {
    const res = await request(app.getHttpServer())
      .post('/members')
      .send({ name: 'John Doe', email: 'john@example.com', merchantId })
      .expect(201);

    expect(res.body).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com',
      merchantId,
    });
    const rows = await dataSource.query(
      `SELECT t.name FROM members m JOIN tiers t ON t.id = m.tier_id WHERE m.id = ?`,
      [res.body.id],
    );
    expect(rows[0].name).toBe('Bronze');
  });

  it('returns 409 for a duplicate email', async () => {
    const body = { name: 'John Doe', email: 'john@example.com', merchantId };
    await request(app.getHttpServer()).post('/members').send(body).expect(201);
    await request(app.getHttpServer()).post('/members').send(body).expect(409);
  });

  it('returns 400 when a field is missing', async () => {
    await request(app.getHttpServer())
      .post('/members')
      .send({ name: 'John Doe', merchantId })
      .expect(400);
  });

  it('returns 404 for an unknown id', async () => {
    await request(app.getHttpServer()).get('/members/999999').expect(404);
  });

  it('gets a created member by id', async () => {
    const created = await request(app.getHttpServer())
      .post('/members')
      .send({ name: 'John Doe', email: 'john@example.com', merchantId })
      .expect(201);
    const res = await request(app.getHttpServer())
      .get(`/members/${created.body.id}`)
      .expect(200);
    expect(res.body.email).toBe('john@example.com');
  });
});
