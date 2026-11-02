import { parseMaxPointsPerOrder } from './orders.config';

describe('parseMaxPointsPerOrder', () => {
  it.each([
    ['10000', 10_000],
    ['1', 1],
  ])('parses %s', (raw, expected) => {
    expect(parseMaxPointsPerOrder(raw)).toBe(expected);
  });

  it.each(['abc', '', '0', '-5', '1.5', '9007199254740993'])(
    'rejects %p',
    (raw) => {
      expect(() => parseMaxPointsPerOrder(raw)).toThrow('MAX_POINTS_PER_ORDER');
    },
  );
});
