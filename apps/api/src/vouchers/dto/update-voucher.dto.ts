import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  Max,
  Min,
  MinDate,
  ValidateIf,
} from 'class-validator';
import { IsWholeSeconds } from './is-whole-seconds';

// Every field is optional, but null is not a value: the columns are NOT NULL.
const sent = (_: unknown, value: unknown) => value !== undefined;

// Price and face value stay as issued: members hold codes bought at them.
export class UpdateVoucherDto {
  // INT UNSIGNED column
  @ValidateIf(sent)
  @IsInt()
  @Min(0)
  @Max(4294967295)
  stock?: number;

  @ValidateIf(sent)
  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date())
  @IsWholeSeconds()
  validUntil?: Date;

  // One way: a retired voucher is never offered again
  @ValidateIf(sent)
  @IsIn(['expired'])
  status?: 'expired';
}
