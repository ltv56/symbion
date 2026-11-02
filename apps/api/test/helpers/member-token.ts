import { INestApplication } from '@nestjs/common';
import request from 'supertest';

// Needs DEMO_MODE=true (set in setup-env).
export async function memberToken(
  app: INestApplication,
  email: string,
): Promise<string> {
  const server = app.getHttpServer();
  const { body } = await request(server)
    .post('/auth/member/otp')
    .send({ email })
    .expect(200);
  const res = await request(server)
    .post('/auth/member/login')
    .send({ email, otp: body.otp })
    .expect(200);
  return res.body.accessToken;
}
