import { monthPeriod } from './period';

describe('monthPeriod', () => {
  it.each([
    ['2026-10', '2026-09-30T17:00:00.000Z', '2026-10-31T17:00:00.000Z'],
    ['2026-12', '2026-11-30T17:00:00.000Z', '2026-12-31T17:00:00.000Z'],
    ['2028-02', '2028-01-31T17:00:00.000Z', '2028-02-29T17:00:00.000Z'],
    ['2000-01', '1999-12-31T17:00:00.000Z', '2000-01-31T17:00:00.000Z'],
  ])('%s starts at %s and ends at %s', (month, start, end) => {
    const period = monthPeriod(month);

    expect(period.start.toISOString()).toBe(start);
    expect(period.end.toISOString()).toBe(end);
  });
});
