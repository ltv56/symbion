import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trim } from '../../common/dto';

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const MAX_SEARCH = 100;

export class AdminListMembersQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number = DEFAULT_LIMIT;

  // Cursor: id of the last member on the previous page
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  after?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  merchantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  tierId?: number;

  // Part of the name or the email
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(MAX_SEARCH)
  q?: string;
}
