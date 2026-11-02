// Fixed admin settings so every e2e suite can boot AppModule without a local .env.
// The hash is scrypt of ADMIN_TEST_PASSWORD (see src/auth/password-hash.ts).
export const ADMIN_TEST_EMAIL = 'admin@example.com';
export const ADMIN_TEST_PASSWORD = 'admin-test-password';
const ADMIN_TEST_PASSWORD_HASH =
  'scrypt$8de3a4194a8b85d26cd5a5b7a479b782$db771f290d24a1f306ba85f90ce47b09f460bf38d207a400a14999288a59214fc62451c6d9912c00b3fdde88eddcdae8e42b5d884b50bba2e257233918f8b446';

process.env.ADMIN_EMAIL = ADMIN_TEST_EMAIL;
process.env.ADMIN_PASSWORD_HASH = ADMIN_TEST_PASSWORD_HASH;
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DEMO_MODE = 'true';
