import { hashPassword, verifyPassword } from './password-hash';

describe('password hash', () => {
  it('verifies the password it hashed', async () => {
    const stored = await hashPassword('correct horse');
    await expect(verifyPassword('correct horse', stored)).resolves.toBe(true);
  });

  it('rejects a different password', async () => {
    const stored = await hashPassword('correct horse');
    await expect(verifyPassword('wrong horse', stored)).resolves.toBe(false);
  });

  it('uses a new salt each time', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });

  it('stores scrypt$<salt hex>$<hash hex> with a 16 byte salt and a 64 byte hash', async () => {
    const [scheme, salt, hash] = (await hashPassword('x')).split('$');
    expect(scheme).toBe('scrypt');
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });

  it.each([
    ['an empty string', ''],
    ['no separators', 'scrypt'],
    ['another scheme', 'bcrypt$aa$bb'],
    ['a missing hash', 'scrypt$aabb'],
    ['non-hex parts', 'scrypt$zz$yy'],
    ['an extra part', 'scrypt$aa$bb$cc'],
  ])('returns false for a malformed stored value: %s', async (_label, bad) => {
    await expect(verifyPassword('x', bad)).resolves.toBe(false);
  });
});
