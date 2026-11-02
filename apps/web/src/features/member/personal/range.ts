// Months from the current one
export interface Range {
  from: number;
  to: number;
}

export const FUTURE: Range = { from: 0, to: 12 };
export const PAST: Range = { from: -12, to: 0 };

export function inRange(offset: number, range: Range): boolean {
  return offset >= range.from && offset <= range.to;
}
