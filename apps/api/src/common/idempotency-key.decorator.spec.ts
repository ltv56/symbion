import { BadRequestException } from '@nestjs/common';
import { parseIdempotencyKey } from './idempotency-key.decorator';

describe('parseIdempotencyKey', () => {
  it.each([
    ['order-1', 'order-1'],
    ['  order-1  ', 'order-1'],
    ['k'.repeat(255), 'k'.repeat(255)],
  ])('accepts %j as %j', (header, expected) => {
    expect(parseIdempotencyKey(header)).toBe(expected);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['blank', '   '],
    ['too long', 'k'.repeat(256)],
    ['repeated header', ['a', 'b']],
  ])('rejects a %s header', (_name, header) => {
    expect(() => parseIdempotencyKey(header)).toThrow(BadRequestException);
  });
});
