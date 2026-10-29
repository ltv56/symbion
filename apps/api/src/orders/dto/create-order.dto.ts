import { Transform } from 'class-transformer';
import { IsEmail, IsInt, Max, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Whole VND. The max keeps amount × tier percent (up to 99,999) below 2^53.
const MAX_AMOUNT = 9_999_999_999;

export class CreateOrderDto {
  @Transform(trim)
  @IsEmail()
  memberEmail!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amount!: number;
}
