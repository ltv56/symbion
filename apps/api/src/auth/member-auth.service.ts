import {
  createHash,
  createHmac,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource, EntityManager } from 'typeorm';
import { isDuplicateEntry } from '../common/is-duplicate-entry';
import { MailService } from '../mail/mail.service';

const OTP_LIFETIME_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const SIGNUP_COOLDOWN_SECONDS = 30;
const SYSTEM_MERCHANT_NAME = 'Symbion';

@Injectable()
export class MemberAuthService {
  private readonly logger = new Logger(MemberAuthService.name);
  private readonly secret: string;
  private readonly demoMode: boolean;

  constructor(
    config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_SECRET');
    this.demoMode = config.get<string>('DEMO_MODE') === 'true';
  }

  // One form signs in and signs up: a new email gets a sign-up code instead, and the right code creates the member.
  // Both answer the same, so the form does not reveal who is registered.
  // The code is emailed, and returned in the response only in demo mode.
  async requestOtp(email: string): Promise<{ otp?: string }> {
    const [member]: { id: number }[] = await this.dataSource.query(
      'SELECT id FROM members WHERE email = ?',
      [email],
    );
    if (!member) {
      return this.signup(email, email.split('@')[0] ?? email);
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
    await this.sendCode(email, otp);
    return this.demoMode ? { otp } : {};
  }

  // A member only exists after the emailed code is confirmed.
  // An existing email gets the same answer and no mail, so the form does not reveal who is registered.
  async signup(email: string, name: string): Promise<{ otp?: string }> {
    const [member]: { id: number }[] = await this.dataSource.query(
      'SELECT id FROM members WHERE email = ?',
      [email],
    );
    if (member) {
      return {};
    }
    const [recent]: { id: number }[] = await this.dataSource.query(
      'SELECT 1 AS id FROM member_signups WHERE email = ? AND created_at > NOW() - INTERVAL ? SECOND',
      [email, SIGNUP_COOLDOWN_SECONDS],
    );
    if (recent) {
      throw new HttpException(
        'Wait a moment before asking for a new code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = String(randomInt(1_000_000)).padStart(6, '0');
    await this.dataSource.query(
      `INSERT INTO member_signups (email, name, code_hash, attempts, expires_at) VALUES (?, ?, ?, 0, ?) AS new
      ON DUPLICATE KEY UPDATE name = new.name, code_hash = new.code_hash, attempts = 0,
        expires_at = new.expires_at, created_at = CURRENT_TIMESTAMP`,
      [
        email,
        name,
        this.hash(`signup:${email}`, otp),
        new Date(Date.now() + OTP_LIFETIME_MS),
      ],
    );
    await this.sendCode(email, otp);
    return this.demoMode ? { otp } : {};
  }

  async confirmSignup(
    email: string,
    otp: string,
  ): Promise<{ accessToken: string }> {
    // Return instead of throw inside the tx: a throw rolls back the attempt count.
    const memberId = await this.dataSource.transaction(async (tx) => {
      const [row]: {
        name: string;
        code_hash: string;
        attempts: number;
        expires_at: Date;
      }[] = await tx.query(
        'SELECT name, code_hash, attempts, expires_at FROM member_signups WHERE email = ? FOR UPDATE',
        [email],
      );
      if (!row) {
        return null;
      }
      if (row.expires_at <= new Date()) {
        await tx.query('DELETE FROM member_signups WHERE email = ?', [email]);
        return null;
      }
      if (this.matches(row.code_hash, this.hash(`signup:${email}`, otp))) {
        await tx.query('DELETE FROM member_signups WHERE email = ?', [email]);
        return this.createMember(tx, email, row.name);
      }
      if (row.attempts + 1 >= MAX_ATTEMPTS) {
        await tx.query('DELETE FROM member_signups WHERE email = ?', [email]);
      } else {
        await tx.query(
          'UPDATE member_signups SET attempts = attempts + 1 WHERE email = ?',
          [email],
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

  async login(email: string, otp: string): Promise<{ accessToken: string }> {
    const [existing]: { id: number }[] = await this.dataSource.query(
      'SELECT id FROM members WHERE email = ?',
      [email],
    );
    if (!existing) {
      return this.confirmSignup(email, otp);
    }
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

  // A failed send is logged: the response must not tell whether the email exists.
  private async sendCode(email: string, otp: string): Promise<void> {
    try {
      await this.mail.send({
        to: email,
        subject: 'Symbion: mã đăng nhập / your sign-in code',
        text: `Mã đăng nhập Symbion của bạn là ${otp}. Mã có hiệu lực trong 5 phút.\n\nYour Symbion sign-in code is ${otp}. It is valid for 5 minutes.\n`,
      });
    } catch (error) {
      this.logger.error(
        `could not send the code: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Self sign-ups belong to one system merchant. The key hash comes from the secret, so nobody holds a key for it
  // and the unique index keeps it a single row.
  private async systemMerchantId(tx: EntityManager): Promise<number> {
    const key = createHmac('sha256', this.secret)
      .update('system-merchant')
      .digest('hex');
    const result: { insertId: number | string } = await tx.query(
      `INSERT INTO merchants (name, api_key_hash) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [SYSTEM_MERCHANT_NAME, createHash('sha256').update(key).digest('hex')],
    );
    return Number(result.insertId);
  }

  // The email may have become a member between the request and the confirmation: sign that member in.
  private async createMember(
    tx: EntityManager,
    email: string,
    name: string,
  ): Promise<number> {
    const [tier]: { id: number }[] = await tx.query(
      'SELECT id FROM tiers ORDER BY min_spend ASC LIMIT 1',
    );
    if (!tier) {
      throw new ServiceUnavailableException('No tiers configured');
    }
    const merchantId = await this.systemMerchantId(tx);
    try {
      const result: { insertId: number | string } = await tx.query(
        'INSERT INTO members (merchant_id, tier_id, email, name) VALUES (?, ?, ?, ?)',
        [merchantId, Number(tier.id), email, name],
      );
      return Number(result.insertId);
    } catch (error) {
      if (!isDuplicateEntry(error)) {
        throw error;
      }
      const [existing]: { id: number }[] = await tx.query(
        'SELECT id FROM members WHERE email = ?',
        [email],
      );
      if (!existing) {
        throw error;
      }
      return Number(existing.id);
    }
  }

  // HMAC: a plain hash of 6 digits is reversed by trying all 1,000,000.
  private hash(memberId: number | string, otp: string): string {
    return createHmac('sha256', this.secret)
      .update(`${memberId}:${otp}`)
      .digest('hex');
  }

  private matches(stored: string, actual: string): boolean {
    return timingSafeEqual(Buffer.from(stored), Buffer.from(actual));
  }
}
