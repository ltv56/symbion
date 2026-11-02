import { generateVoucherCode } from './voucher-code';

describe('generateVoucherCode', () => {
  it('returns 10 Crockford base32 characters', () => {
    for (let i = 0; i < 1000; i++) {
      expect(generateVoucherCode()).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/);
    }
  });

  it('does not repeat in 10,000 codes', () => {
    const codes = new Set(
      Array.from({ length: 10_000 }, () => generateVoucherCode()),
    );
    expect(codes.size).toBe(10_000);
  });
});
