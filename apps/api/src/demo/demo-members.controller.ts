import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

const LIMIT = 20;

type Row = {
  email: string;
  name: string | null;
  tier_name: string;
  balance: string;
};

export type DemoMember = {
  email: string;
  name: string | null;
  tierName: string;
  balance: number;
};

@ApiTags('demo')
@Controller('demo')
export class DemoMembersController {
  private readonly demoMode: boolean;

  constructor(
    private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    this.demoMode = config.get<string>('DEMO_MODE') === 'true';
  }

  // Public: lets the sign-in page suggest accounts
  @Get('members')
  @ApiOperation({ summary: 'Sample members to sign in with (DEMO_MODE only)' })
  async list(): Promise<DemoMember[]> {
    if (!this.demoMode) {
      throw new NotFoundException();
    }
    const rows: Row[] = await this.dataSource.query(
      `SELECT m.email, m.name, t.name AS tier_name,
        (SELECT COALESCE(SUM(l.remaining), 0) FROM ledger_lots l
          WHERE l.member_id = m.id AND (l.expires_at IS NULL OR l.expires_at > ?)) AS balance
      FROM members m JOIN tiers t ON t.id = m.tier_id
      ORDER BY m.id LIMIT ?`,
      [new Date(), LIMIT],
    );
    return rows.map((row) => ({
      email: row.email,
      name: row.name,
      tierName: row.tier_name,
      balance: Number(row.balance),
    }));
  }
}
