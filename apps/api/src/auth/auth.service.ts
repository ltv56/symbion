import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from './password-hash';

@Injectable()
export class AuthService {
  private readonly adminEmail: string;
  private readonly adminPasswordHash: string;

  constructor(
    config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    this.adminEmail = config.getOrThrow<string>('ADMIN_EMAIL').toLowerCase();
    this.adminPasswordHash = config.getOrThrow<string>('ADMIN_PASSWORD_HASH');
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    // Always hash-compare so a wrong email takes as long as a wrong password.
    const passwordOk = await verifyPassword(password, this.adminPasswordHash);
    if (!passwordOk || email.toLowerCase() !== this.adminEmail) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      accessToken: await this.jwt.signAsync({ sub: 'admin', role: 'admin' }),
    };
  }
}
