import { addMonths } from './add-months';

describe('addMonths', () => {
  it.each([
    ['2026-10-30T12:00:00.000Z', 12, '2027-10-30T12:00:00.000Z'],
    ['2028-02-29T08:30:00.000Z', 12, '2029-02-28T08:30:00.000Z'],
    ['2028-02-29T08:30:00.000Z', 48, '2032-02-29T08:30:00.000Z'],
    ['2027-01-31T00:00:00.000Z', 1, '2027-02-28T00:00:00.000Z'],
    ['2027-12-31T23:59:59.999Z', 12, '2028-12-31T23:59:59.999Z'],
  ])('%s + %i months = %s', (from, months, expected) => {
    expect(addMonths(new Date(from), months).toISOString()).toBe(expected);
  });

  it('does not change the input date', () => {
    const from = new Date('2028-02-29T08:30:00.000Z');

    addMonths(from, 12);

    expect(from.toISOString()).toBe('2028-02-29T08:30:00.000Z');
  });
});
