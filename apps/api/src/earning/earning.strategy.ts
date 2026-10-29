export type EarnInput = {
  amountVnd: number;
  tierMultiplierPercent: number;
};

export interface EarningStrategy {
  calculate(input: EarnInput): number;
}
