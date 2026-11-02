import { randomBytes } from 'node:crypto';

// Crockford base32: no I, L, O, U
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 10;

export function generateVoucherCode(): string {
  // no modulo bias: 256 % 32 = 0
  return Array.from(randomBytes(LENGTH), (byte) => ALPHABET[byte % 32]).join(
    '',
  );
}
