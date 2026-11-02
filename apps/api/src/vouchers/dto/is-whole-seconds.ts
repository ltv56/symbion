import { ValidateBy } from 'class-validator';

// TIMESTAMP column has no fraction
export const IsWholeSeconds = () =>
  ValidateBy({
    name: 'isWholeSeconds',
    validator: {
      validate: (value: unknown) =>
        value instanceof Date && value.getMilliseconds() === 0,
      defaultMessage: () => '$property must be in whole seconds',
    },
  });
