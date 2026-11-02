import { Transform } from 'class-transformer';
import { IsEmail, IsInt, Max, Min } from 'class-validator';
import { trim, MAX_AMOUNT_VND } from '../../common/dto';

export class CreateOrderDto {
  @Transform(trim)
  @IsEmail()
  memberEmail!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT_VND)
  amount!: number;
}
