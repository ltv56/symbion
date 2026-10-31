import { Transform } from 'class-transformer';
import { IsEmail, IsInt, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateRedemptionDto {
  @Transform(trim)
  @IsEmail()
  memberEmail!: string;

  @IsInt()
  @Min(1)
  voucherId!: number;
}
