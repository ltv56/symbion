import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, Matches, MaxLength } from 'class-validator';
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

export class SignupDto extends RequestOtpDto {
  @Transform(trim)
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}
