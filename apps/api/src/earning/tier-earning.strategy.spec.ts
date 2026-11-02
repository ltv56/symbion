import { TierEarningStrategy } from './tier-earning.strategy';

describe('TierEarningStrategy', () => {
  const strategy = new TierEarningStrategy(10_000);

  it.each([
    [250_000, 100, 25],
    [250_000, 125, 31],
    [250_000, 150, 37],
    [9_999, 150, 1],
    [5_000, 100, 0],
    [1_000_000, 113, 113],
    [9_999_999_999, 150, 1_499_999],
  ])(
    'calculate(%i, %i) should return %i points',
    (amount, multiplierPercent, expected) => {
      const points = strategy.calculate({
        amountVnd: amount,
        tierMultiplierPercent: multiplierPercent,
      });
      expect(points).toBe(expected);
    },
  );
});
