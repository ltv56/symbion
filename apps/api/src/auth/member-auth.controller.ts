import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { MemberLoginDto, RequestOtpDto } from './dto/member-otp.dto';
import { MemberAuthService } from './member-auth.service';

@Controller('auth/member')
export class MemberAuthController {
  constructor(private readonly memberAuth: MemberAuthService) {}

  @Post('otp')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Code sent if the email is registered; `otp` only in demo mode',
  })
  requestOtp(@Body() body: RequestOtpDto): Promise<{ otp?: string }> {
    return this.memberAuth.requestOtp(body.email);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ description: '`{ accessToken }` with role member' })
  @ApiUnauthorizedResponse({ description: 'Wrong, used or expired code' })
  login(@Body() body: MemberLoginDto): Promise<{ accessToken: string }> {
    return this.memberAuth.login(body.email, body.otp);
  }
}
