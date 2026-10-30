import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { trim } from '../../common/dto';

export class CreateMemberDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Transform(trim)
  @IsEmail()
  email!: string;
}
