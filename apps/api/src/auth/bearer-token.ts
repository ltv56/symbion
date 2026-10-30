import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export type TokenPayload = { sub: string; role: 'admin' | 'member' };

export async function verifyBearer(
  jwt: JwtService,
  request: Request,
  role: TokenPayload['role'],
): Promise<TokenPayload> {
  const [scheme, token] = (request.header('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedException('Missing token');
  }

  let payload: Partial<TokenPayload>;
  try {
    payload = await jwt.verifyAsync(token);
  } catch {
    throw new UnauthorizedException('Invalid token');
  }
  if (payload.role !== role || typeof payload.sub !== 'string') {
    throw new UnauthorizedException('Invalid token');
  }
  return { sub: payload.sub, role };
}
