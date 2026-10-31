import { IsInt, Max, Min } from 'class-validator';
import { MAX_AMOUNT_VND } from '../../common/dto';

export class CreateRefundDto {
  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT_VND)
  amount!: number;
}
