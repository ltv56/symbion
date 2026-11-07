import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { isPasswordHash, verifyPassword } from './password-hash';

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
    if (!isPasswordHash(this.adminPasswordHash)) {
      throw new Error(
        'ADMIN_PASSWORD_HASH is not a scrypt$<salt>$<hash> value; quote it in infra/.env, Compose expands $',
      );
    }
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

    return this.issueAdminToken();
  }

  // For the demo sign-in, which skips the password
  async issueAdminToken(): Promise<{ accessToken: string }> {
    return {
      accessToken: await this.jwt.signAsync({ sub: 'admin', role: 'admin' }),
    };
  }
}
