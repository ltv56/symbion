import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { trim } from '../../common/dto';

export class CreateMerchantDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  name!: string;
}
