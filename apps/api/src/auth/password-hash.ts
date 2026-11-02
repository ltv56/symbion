import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SALT_BYTES = 16;
const HASH_BYTES = 64;
const HEX = /^[0-9a-f]+$/;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, HASH_BYTES, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await derive(password, salt);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function parseStored(stored: string): { salt: Buffer; hash: Buffer } | null {
  const parts = stored.split('$');
  const [scheme, saltHex, hashHex] = parts;
  if (
    parts.length !== 3 ||
    scheme !== 'scrypt' ||
    !saltHex ||
    !hashHex ||
    !HEX.test(saltHex) ||
    !HEX.test(hashHex)
  ) {
    return null;
  }
  return {
    salt: Buffer.from(saltHex, 'hex'),
    hash: Buffer.from(hashHex, 'hex'),
  };
}

export function isPasswordHash(stored: string): boolean {
  return parseStored(stored) !== null;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parsed = parseStored(stored);
  if (!parsed) {
    return false;
  }

  const expected = parsed.hash;
  const actual = await derive(password, parsed.salt);
  // timingSafeEqual throws on a length mismatch
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
