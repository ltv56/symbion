import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';

const OTP_LIFETIME_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class MemberAuthService {
  private readonly secret: string;
  private readonly demoMode: boolean;

  constructor(
    config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_SECRET');
    this.demoMode = config.get<string>('DEMO_MODE') === 'true';
  }

  // Same answer for an unknown email. The code is only returned in demo mode (no email sending yet).
  async requestOtp(email: string): Promise<{ otp?: string }> {
    const [member]: { id: number }[] = await this.dataSource.query(
      'SELECT id FROM members WHERE email = ?',
      [email],
    );
    if (!member) {
      return {};
    }

    const memberId = Number(member.id);
    const otp = String(randomInt(1_000_000)).padStart(6, '0');
    await this.dataSource.query(
      `INSERT INTO member_otps (member_id, code_hash, attempts, expires_at) VALUES (?, ?, 0, ?) AS new
      ON DUPLICATE KEY UPDATE code_hash = new.code_hash, attempts = 0,
        expires_at = new.expires_at, created_at = CURRENT_TIMESTAMP`,
      [
        memberId,
        this.hash(memberId, otp),
        new Date(Date.now() + OTP_LIFETIME_MS),
      ],
    );
    return this.demoMode ? { otp } : {};
  }

  async login(email: string, otp: string): Promise<{ accessToken: string }> {
    // Return instead of throw inside the tx: a throw rolls back the attempt count.
    const memberId = await this.dataSource.transaction(async (tx) => {
      const [row]: {
        member_id: number;
        code_hash: string;
        attempts: number;
        expires_at: Date;
      }[] = await tx.query(
        `SELECT o.member_id, o.code_hash, o.attempts, o.expires_at
        FROM members m JOIN member_otps o ON o.member_id = m.id
        WHERE m.email = ? FOR UPDATE`,
        [email],
      );
      if (!row) {
        return null;
      }

      const id = Number(row.member_id);
      if (row.expires_at <= new Date()) {
        await tx.query('DELETE FROM member_otps WHERE member_id = ?', [id]);
        return null;
      }
      if (this.matches(row.code_hash, this.hash(id, otp))) {
        await tx.query('DELETE FROM member_otps WHERE member_id = ?', [id]);
        return id;
      }
      if (row.attempts + 1 >= MAX_ATTEMPTS) {
        await tx.query('DELETE FROM member_otps WHERE member_id = ?', [id]);
      } else {
        await tx.query(
          'UPDATE member_otps SET attempts = attempts + 1 WHERE member_id = ?',
          [id],
        );
      }
      return null;
    });

    if (memberId === null) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    return {
      accessToken: await this.jwt.signAsync({
        sub: String(memberId),
        role: 'member',
      }),
    };
  }

  // HMAC: a plain hash of 6 digits is reversed by trying all 1,000,000.
  private hash(memberId: number, otp: string): string {
    return createHmac('sha256', this.secret)
      .update(`${memberId}:${otp}`)
      .digest('hex');
  }

  private matches(stored: string, actual: string): boolean {
    return timingSafeEqual(Buffer.from(stored), Buffer.from(actual));
  }
}
