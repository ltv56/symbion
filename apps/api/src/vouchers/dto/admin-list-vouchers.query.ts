import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ListVouchersQuery } from './list-vouchers.query';

export class AdminListVouchersQuery extends ListVouchersQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  merchantId?: number;

  @IsOptional()
  @IsIn(['active', 'expired'])
  status?: 'active' | 'expired';
}
