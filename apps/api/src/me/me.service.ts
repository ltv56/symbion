import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Ledger } from '@symbion/ledger';
import { DataSource, EntityManager } from 'typeorm';
import { spendLast12Months } from '../tiers/spend';

const HISTORY_LIMIT = 50;

export type Profile = {
  id: number;
  email: string;
  name: string | null;
  tier: { id: number; name: string };
  balance: number;
  spend12m: number;
  nextTier: { id: number; name: string; minSpend: number } | null;
};

export type UnspentLot = {
  id: number;
  merchantId: number;
  merchantName: string;
  remaining: number;
  expiresAt: Date | null;
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
      tier_min_spend: string;
    }[] = await this.dataSource.query(
      `SELECT m.email, m.name, t.id AS tier_id, t.name AS tier_name, t.min_spend AS tier_min_spend
      FROM members m JOIN tiers t ON t.id = m.tier_id
      WHERE m.id = ?`,
      [memberId],
    );
    // Valid token for a member that no longer exists
    if (!member) {
      throw new UnauthorizedException('Invalid token');
    }

    const now = new Date();
    const balance = await this.ledger.balance(
      this.dataSource.manager,
      String(memberId),
      now,
    );
    const spend12m = await spendLast12Months(
      this.dataSource.manager,
      memberId,
      now,
    );
    // Next above the current tier, not above the spend: the tier only changes on an order or refund
    const [next]: { id: number; name: string; min_spend: string }[] =
      await this.dataSource.query(
        `SELECT id, name, min_spend FROM tiers
        WHERE min_spend > ? ORDER BY min_spend LIMIT 1`,
        [Number(member.tier_min_spend)],
      );
    return {
      id: memberId,
      email: member.email,
      name: member.name,
      tier: { id: Number(member.tier_id), name: member.tier_name },
      balance,
      spend12m,
      nextTier: next
        ? {
            id: Number(next.id),
            name: next.name,
            minSpend: Number(next.min_spend),
          }
        : null,
    };
  }

  // Same order the ledger spends them in
  async lots(memberId: number): Promise<UnspentLot[]> {
    const rows: {
      id: number;
      merchant_id: number;
      merchant_name: string;
      remaining: number;
      expires_at: Date | null;
    }[] = await this.dataSource.query(
      `SELECT l.id, l.merchant_id, mc.name AS merchant_name, l.remaining, l.expires_at
      FROM ledger_lots l JOIN merchants mc ON mc.id = l.merchant_id
      WHERE l.member_id = ? AND l.type = 'earn' AND l.remaining > 0
        AND (l.expires_at IS NULL OR l.expires_at > ?)
      ORDER BY l.expires_at IS NULL, l.expires_at, l.id`,
      [memberId, new Date()],
    );
    return rows.map((row) => ({
      id: Number(row.id),
      merchantId: Number(row.merchant_id),
      merchantName: row.merchant_name,
      remaining: Number(row.remaining),
      expiresAt: row.expires_at,
    }));
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
