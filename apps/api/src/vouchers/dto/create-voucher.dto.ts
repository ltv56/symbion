import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinDate,
  ValidateBy,
} from 'class-validator';
import { trim } from '../../common/dto';

// TIMESTAMP column has no fraction
const IsWholeSeconds = () =>
  ValidateBy({
    name: 'isWholeSeconds',
    validator: {
      validate: (value: unknown) =>
        value instanceof Date && value.getMilliseconds() === 0,
      defaultMessage: () => '$property must be in whole seconds',
    },
  });

export class CreateVoucherDto {
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  merchantId!: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  // VND
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  faceValue!: number;

  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  pointsPrice!: number;

  // INT UNSIGNED column
  @IsInt()
  @Min(0)
  @Max(4294967295)
  stock!: number;

  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date())
  @IsWholeSeconds()
  validUntil!: Date;
}
