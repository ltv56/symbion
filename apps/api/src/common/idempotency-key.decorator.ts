import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

// 255 = idempotency_key column length.
export function parseIdempotencyKey(header: unknown): string {
  const key = typeof header === 'string' ? header.trim() : '';
  if (!key || key.length > 255) {
    throw new BadRequestException(
      'Idempotency-Key header is required (max 255 characters)',
    );
  }
  return key;
}

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    parseIdempotencyKey(
      context.switchToHttp().getRequest<Request>().headers['idempotency-key'],
    ),
);
