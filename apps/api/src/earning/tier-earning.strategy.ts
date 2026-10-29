import { EarnInput, EarningStrategy } from './earning.strategy';

export class TierEarningStrategy implements EarningStrategy {
  constructor(private readonly baseUnitVnd: number) {}

  // Multiply first, divide once: dividing first goes through floats (1_000_000 / 10_000  * 1.13 = floor(112.99) = 112 ) => 1_000_000 * 113 / 10_000 *100 = 113.
  // Round down.
  calculate(input: EarnInput): number {
    return Math.floor(
      (input.amountVnd * input.tierMultiplierPercent) /
        (this.baseUnitVnd * 100),
    );
  }
}
