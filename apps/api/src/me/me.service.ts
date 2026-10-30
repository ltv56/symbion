import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Ledger } from '@symbion/ledger';
import { DataSource, EntityManager } from 'typeorm';

const HISTORY_LIMIT = 50;

export type Profile = {
  id: number;
  email: string;
  name: string | null;
  tier: { id: number; name: string };
  balance: number;
};

export type HistoryEntry = {
  id: number;
  type: 'earn' | 'spend';
  points: number;
  merchantId: number;
  merchantName: string;
  ref: { type: string; id: number } | null;
  expiresAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class MeService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: Ledger<EntityManager>,
  ) {}

  async profile(memberId: number): Promise<Profile> {
    const [member]: {
      email: string;
      name: string | null;
      tier_id: number;
      tier_name: string;
    }[] = await this.dataSource.query(
      `SELECT m.email, m.name, t.id AS tier_id, t.name AS tier_name
      FROM members m JOIN tiers t ON t.id = m.tier_id
      WHERE m.id = ?`,
      [memberId],
    );
    // Valid token for a member that no longer exists
    if (!member) {
      throw new UnauthorizedException('Invalid token');
    }

    const balance = await this.ledger.balance(
      this.dataSource.manager,
      String(memberId),
      new Date(),
    );
    return {
      id: memberId,
      email: member.email,
      name: member.name,
      tier: { id: Number(member.tier_id), name: member.tier_name },
      balance,
    };
  }

  async history(memberId: number): Promise<HistoryEntry[]> {
    const rows: {
      id: number;
      type: 'earn' | 'spend';
      points: number;
      merchant_id: number;
      merchant_name: string;
      ref_type: string | null;
      ref_id: number | null;
      expires_at: Date | null;
      created_at: Date;
    }[] = await this.dataSource.query(
      `SELECT l.id, l.type, l.points, l.merchant_id, mc.name AS merchant_name,
        l.ref_type, l.ref_id, l.expires_at, l.created_at
      FROM ledger_lots l JOIN merchants mc ON mc.id = l.merchant_id
      WHERE l.member_id = ?
      ORDER BY l.id DESC
      LIMIT ?`,
      [memberId, HISTORY_LIMIT],
    );
    return rows.map((row) => ({
      id: Number(row.id),
      type: row.type,
      points: Number(row.points),
      merchantId: Number(row.merchant_id),
      merchantName: row.merchant_name,
      ref:
        row.ref_type !== null && row.ref_id !== null
          ? { type: row.ref_type, id: Number(row.ref_id) }
          : null,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }));
  }
}
