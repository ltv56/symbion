import { Transform } from 'class-transformer';
import { IsEmail, IsNumber, IsPositive } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateOrderDto {
  @Transform(trim)
  @IsEmail()
  memberEmail!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;
}
