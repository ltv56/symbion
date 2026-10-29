import { orderRequestHash } from './order-request-hash';

describe('orderRequestHash', () => {
  it('is a sha-256 hex digest', () => {
    expect(orderRequestHash('a@example.com', 10_000)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('ignores the case of the email', () => {
    expect(orderRequestHash('John@Example.com', 10_000)).toBe(
      orderRequestHash('john@example.com', 10_000),
    );
  });

  it.each([
    ['another amount', 'a@example.com', 10_001],
    ['another email', 'b@example.com', 10_000],
  ])('differs for %s', (_label, email, amount) => {
    expect(orderRequestHash(email, amount)).not.toBe(
      orderRequestHash('a@example.com', 10_000),
    );
  });
});
