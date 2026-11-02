import { Transform } from 'class-transformer';
import { IsEmail, Matches } from 'class-validator';
import { trim } from '../../common/dto';

export class RequestOtpDto {
  @Transform(trim)
  @IsEmail()
  email!: string;
}

export class MemberLoginDto extends RequestOtpDto {
  @Matches(/^\d{6}$/)
  otp!: string;
}
