// DI token
export const EARNING_STRATEGY = 'EARNING_STRATEGY';

export type EarnInput = {
  amountVnd: number;
  tierMultiplierPercent: number;
};

export interface EarningStrategy {
  calculate(input: EarnInput): number;
}
