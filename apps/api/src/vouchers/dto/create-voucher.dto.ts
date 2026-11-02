import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinDate,
} from 'class-validator';
import { trim } from '../../common/dto';
import { IsWholeSeconds } from './is-whole-seconds';

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

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value.map((step) => trim({ value: step })) : value,
  )
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(200, { each: true })
  steps?: string[];

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
