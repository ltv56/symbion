import { createHash } from 'node:crypto';
import {
  Controller,
  Get,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { verifyPassword } from '../auth/password-hash';
import { MERCHANTS } from '../seed-demo-data';

type MerchantRow = { id: number; name: string; api_key_hash: string };

export type DemoAccounts = {
  admin: { email: string; password: string } | null;
  merchants: { id: number; name: string; apiKey: string }[];
};

// Public on purpose, and only in DEMO_MODE: the demo's credentials are meant to be tried
@ApiTags('demo')
@Controller('demo')
export class DemoAccountsController implements OnModuleInit {
  private readonly demoMode: boolean;
  private readonly adminEmail: string;
  private readonly adminHash: string;
  private readonly adminPassword: string | undefined;
  private readonly apiKey: string | undefined;

  constructor(
    private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    this.demoMode = config.get<string>('DEMO_MODE') === 'true';
    this.adminEmail = config.getOrThrow<string>('ADMIN_EMAIL');
    this.adminHash = config.getOrThrow<string>('ADMIN_PASSWORD_HASH');
    this.adminPassword = config.get<string>('DEMO_ADMIN_PASSWORD') || undefined;
    this.apiKey = config.get<string>('DEMO_API_KEY') || undefined;
  }

  // A wrong password would be shown to visitors and never work
  async onModuleInit(): Promise<void> {
    if (
      this.adminPassword !== undefined &&
      !(await verifyPassword(this.adminPassword, this.adminHash))
    ) {
      throw new Error('DEMO_ADMIN_PASSWORD does not match ADMIN_PASSWORD_HASH');
    }
  }

  @Get('accounts')
  @ApiOperation({
    summary: 'Admin login and merchant keys to try (DEMO_MODE only)',
  })
  async accounts(): Promise<DemoAccounts> {
    if (!this.demoMode) {
      throw new NotFoundException();
    }
    return {
      admin:
        this.adminPassword === undefined
          ? null
          : { email: this.adminEmail, password: this.adminPassword },
      merchants: await this.merchants(),
    };
  }

  // The seed derives each key from DEMO_API_KEY; a merchant whose key changed is left out
  private async merchants(): Promise<DemoAccounts['merchants']> {
    const baseKey = this.apiKey;
    if (baseKey === undefined) {
      return [];
    }
    const rows: MerchantRow[] = await this.dataSource.query(
      'SELECT id, name, api_key_hash FROM merchants ORDER BY id',
    );
    const byHash = new Map(rows.map((row) => [row.api_key_hash, row]));
    const found: DemoAccounts['merchants'] = [];
    for (const { keySuffix } of MERCHANTS) {
      const apiKey = baseKey + keySuffix;
      const row = byHash.get(createHash('sha256').update(apiKey).digest('hex'));
      if (row) {
        found.push({ id: Number(row.id), name: row.name, apiKey });
      }
    }
    return found;
  }
}
