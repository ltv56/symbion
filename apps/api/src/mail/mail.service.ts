import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export type MailMessage = { to: string; subject: string; text: string };

const DEFAULT_PORT = 587;
const SECURE_PORT = 465;

// Without SMTP_HOST nothing is sent (development, demo)
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    if (!host) {
      this.transport = null;
      this.from = '';
      return;
    }
    const port = Number(config.get<string>('SMTP_PORT', String(DEFAULT_PORT)));
    const user = config.get<string>('SMTP_USER');
    this.from = config.getOrThrow<string>('SMTP_FROM');
    this.transport = createTransport({
      host,
      port,
      secure: port === SECURE_PORT,
      auth: user
        ? { user, pass: config.getOrThrow<string>('SMTP_PASSWORD') }
        : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transport) {
      this.logger.warn('SMTP_HOST is not set, mail not sent');
      return;
    }
    await this.transport.sendMail({ from: this.from, ...message });
  }
}
