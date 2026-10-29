import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ADMIN_TEST_EMAIL, ADMIN_TEST_PASSWORD } from '../setup-env';

export async function adminToken(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: ADMIN_TEST_EMAIL, password: ADMIN_TEST_PASSWORD })
    .expect(200);
  return res.body.accessToken;
}
