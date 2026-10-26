import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  Max,
  Min,
  ValidateBy,
  ValidationOptions,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Bounds match the amount column, DECIMAL(12,2): one cent up to 9,999,999,999.99.
export const MIN_AMOUNT = 0.01;
export const MAX_AMOUNT = 9_999_999_999.99;

// Not IsNumber({ maxDecimalPlaces }): in class-validator 0.15 it throws (500)
// on exponent-form numbers such as 1e-9.
const IsCents = (options?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'isCents',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'number' && Number(value.toFixed(2)) === value,
        defaultMessage: () => 'amount must have at most 2 decimal places',
      },
    },
    options,
  );

export class CreateOrderDto {
  @Transform(trim)
  @IsEmail()
  memberEmail!: string;

  @IsNumber()
  @IsCents()
  @Min(MIN_AMOUNT)
  @Max(MAX_AMOUNT)
  amount!: number;
}
