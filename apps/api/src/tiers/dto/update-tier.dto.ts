import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MAX_AMOUNT_VND, trim } from '../../common/dto';

// Every field is optional, but null is not a value: the columns are NOT NULL.
const sent = (_: unknown, value: unknown) => value !== undefined;

export class UpdateTierDto {
  @ValidateIf(sent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ValidateIf(sent)
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT_VND)
  minSpend?: number;

  @ValidateIf(sent)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999.99)
  earnRate?: number;
}
