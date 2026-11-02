// DI token
export const MAX_POINTS_PER_ORDER = Symbol('MAX_POINTS_PER_ORDER');

export function parseMaxPointsPerOrder(raw: string): number {
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `MAX_POINTS_PER_ORDER must be a positive integer, got "${raw}"`,
    );
  }
  return value;
}
