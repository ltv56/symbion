import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { hashPassword } from './password-hash';

function configWith(hash: string): ConfigService {
  const values: Record<string, string> = {
    ADMIN_EMAIL: 'admin@example.com',
    ADMIN_PASSWORD_HASH: hash,
  };
  return {
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('AuthService startup', () => {
  it('starts with a valid password hash', async () => {
    const hash = await hashPassword('x');
    expect(
      () => new AuthService(configWith(hash), {} as JwtService),
    ).not.toThrow();
  });

  it.each([
    ['the placeholder', 'change-me'],
    ['a value cut at the first $', 'scrypt'],
    ['a value missing its hash part', 'scrypt$aabbccdd'],
  ])('refuses to start with %s', (_label, bad) => {
    expect(() => new AuthService(configWith(bad), {} as JwtService)).toThrow(
      /ADMIN_PASSWORD_HASH/,
    );
  });
});
