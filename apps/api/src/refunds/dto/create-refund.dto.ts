import { IsInt, Max, Min } from 'class-validator';

// Whole VND, same max as an order amount.
const MAX_AMOUNT = 9_999_999_999;

export class CreateRefundDto {
  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amount!: number;
}
