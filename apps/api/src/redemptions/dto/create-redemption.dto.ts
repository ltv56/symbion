import { Transform } from 'class-transformer';
import { IsEmail, IsInt, Min } from 'class-validator';
import { trim } from '../../common/dto';

export class RedeemVoucherDto {
  @IsInt()
  @Min(1)
  voucherId!: number;
}

export class CreateRedemptionDto extends RedeemVoucherDto {
  @Transform(trim)
  @IsEmail()
  memberEmail!: string;
}
