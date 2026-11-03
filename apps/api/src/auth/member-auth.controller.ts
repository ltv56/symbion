import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MemberLoginDto, RequestOtpDto, SignupDto } from './dto/member-otp.dto';
import { MemberAuthService } from './member-auth.service';

@Controller('auth/member')
export class MemberAuthController {
  constructor(private readonly memberAuth: MemberAuthService) {}

  @Post('otp')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Code sent if the email is registered, `{ newAccount: true }` if not; `otp` only in demo mode',
  })
  requestOtp(
    @Body() body: RequestOtpDto,
  ): Promise<{ otp?: string; newAccount?: true }> {
    return this.memberAuth.requestOtp(body.email);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ description: '`{ accessToken }` with role member' })
  @ApiUnauthorizedResponse({ description: 'Wrong, used or expired code' })
  login(@Body() body: MemberLoginDto): Promise<{ accessToken: string }> {
    return this.memberAuth.login(body.email, body.otp);
  }

  @Post('signup')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Code emailed if the email is not a member yet; `otp` only in demo mode',
  })
  @ApiTooManyRequestsResponse({ description: 'A code was sent a moment ago' })
  signup(@Body() body: SignupDto): Promise<{ otp?: string }> {
    return this.memberAuth.signup(body.email, body.name);
  }

  @Post('signup/confirm')
  @ApiCreatedResponse({
    description: 'The member is created; `{ accessToken }` with role member',
  })
  @ApiUnauthorizedResponse({ description: 'Wrong, used or expired code' })
  confirmSignup(
    @Body() body: MemberLoginDto,
  ): Promise<{ accessToken: string }> {
    return this.memberAuth.confirmSignup(body.email, body.otp);
  }
}
