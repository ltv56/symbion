// For @Transform: trims strings, leaves other values to the validators.
export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Whole VND for orders and refunds. The max keeps amount × tier percent (up to 99,999) below 2^53.
export const MAX_AMOUNT_VND = 9_999_999_999;
