import { Transform } from 'class-transformer';
import { IsEmail, IsInt, Min } from 'class-validator';
import { trim } from '../../common/dto';

export class CreateRedemptionDto {
  @Transform(trim)
  @IsEmail()
  memberEmail!: string;

  @IsInt()
  @Min(1)
  voucherId!: number;
}
