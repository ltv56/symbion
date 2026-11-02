import { QueryFailedError } from 'typeorm';
import { isDuplicateEntry } from './is-duplicate-entry';

const queryError = (driverError: object) =>
  new QueryFailedError(
    'INSERT ...',
    [],
    Object.assign(new Error(), driverError),
  );

const duplicate = queryError({
  code: 'ER_DUP_ENTRY',
  sqlMessage: "Duplicate entry 'k' for key 'refunds.uq_refunds_key'",
});

describe('isDuplicateEntry', () => {
  it.each([
    {
      name: 'a duplicate entry',
      error: duplicate,
      constraint: undefined,
      expected: true,
    },
    {
      name: 'the named constraint',
      error: duplicate,
      constraint: 'uq_refunds_key',
      expected: true,
    },
    {
      name: 'another constraint',
      error: duplicate,
      constraint: 'uq_orders_key',
      expected: false,
    },
    {
      name: 'another driver code',
      error: queryError({ code: 'ER_NO_REFERENCED_ROW_2' }),
      constraint: undefined,
      expected: false,
    },
    {
      name: 'a duplicate without sqlMessage',
      error: queryError({ code: 'ER_DUP_ENTRY' }),
      constraint: 'uq_refunds_key',
      expected: false,
    },
    {
      name: 'a plain Error',
      error: new Error('ER_DUP_ENTRY'),
      constraint: undefined,
      expected: false,
    },
    {
      name: 'a non-error value',
      error: 'ER_DUP_ENTRY',
      constraint: undefined,
      expected: false,
    },
  ])('$name → $expected', ({ error, constraint, expected }) => {
    expect(isDuplicateEntry(error, constraint)).toBe(expected);
  });
});
