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
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

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
  validUntil!: Date;
}
