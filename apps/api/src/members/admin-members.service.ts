import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  HistoryEntry,
  MeService,
  MemberRedemption,
  Profile,
  UnspentLot,
} from '../me/me.service';
import { AdminListMembersQuery } from './dto/admin-list-members.query';

const HISTORY_LIMIT = 50;

export type AdminMember = {
  id: number;
  merchantId: number;
  merchantName: string;
  email: string;
  name: string | null;
  tier: { id: number; name: string };
  balance: number;
  createdAt: Date;
};

export interface AdminMemberPage {
  items: AdminMember[];
  nextCursor: number | null;
}

export type AdminMemberDetail = AdminMember & {
  spend12m: number;
  nextTier: Profile['nextTier'];
  lots: UnspentLot[];
  history: HistoryEntry[];
  redemptions: MemberRedemption[];
};

type Row = {
  id: number;
  merchant_id: number;
  merchant_name: string;
  email: string;
  name: string | null;
  created_at: Date;
  tier_id: number;
  tier_name: string;
  balance: string;
};

// The balance is the sum of the unexpired lots, as the ledger counts it
const SELECT = `SELECT m.id, m.merchant_id, mc.name AS merchant_name, m.email, m.name, m.created_at,
    t.id AS tier_id, t.name AS tier_name,
    (SELECT COALESCE(SUM(l.remaining), 0) FROM ledger_lots l
      WHERE l.member_id = m.id AND (l.expires_at IS NULL OR l.expires_at > ?)) AS balance
  FROM members m
    JOIN merchants mc ON mc.id = m.merchant_id
    JOIN tiers t ON t.id = m.tier_id`;

// % and _ in a search are plain characters
const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');

function toMember(row: Row): AdminMember {
  return {
    id: Number(row.id),
    merchantId: Number(row.merchant_id),
    merchantName: row.merchant_name,
    email: row.email,
    name: row.name,
    tier: { id: Number(row.tier_id), name: row.tier_name },
    balance: Number(row.balance),
    createdAt: row.created_at,
  };
}

@Injectable()
export class AdminMembersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly me: MeService,
  ) {}

  // Keyset pagination; one extra row tells whether another page exists
  async list(query: AdminListMembersQuery): Promise<AdminMemberPage> {
    const { limit, after, merchantId, tierId, q } = query;
    const where: string[] = [];
    const params: unknown[] = [];
    if (after) {
      where.push('m.id < ?');
      params.push(after);
    }
    if (merchantId) {
      where.push('m.merchant_id = ?');
      params.push(merchantId);
    }
    if (tierId) {
      where.push('m.tier_id = ?');
      params.push(tierId);
    }
    if (q) {
      where.push('(m.name LIKE ? OR m.email LIKE ?)');
      const like = `%${escapeLike(q)}%`;
      params.push(like, like);
    }

    const rows: Row[] = await this.dataSource.query(
      `${SELECT}
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY m.id DESC
      LIMIT ?`,
      [new Date(), ...params, limit + 1],
    );
    const items = rows.slice(0, limit).map(toMember);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: rows.length > limit && last ? last.id : null,
    };
  }

  async detail(id: number): Promise<AdminMemberDetail | null> {
    const [row]: Row[] = await this.dataSource.query(
      `${SELECT} WHERE m.id = ?`,
      [new Date(), id],
    );
    if (!row) {
      return null;
    }
    const [profile, lots, history, redemptions] = await Promise.all([
      this.me.profile(id),
      this.me.lots(id),
      this.me.history(id, HISTORY_LIMIT),
      this.me.redemptions(id),
    ]);
    return {
      ...toMember(row),
      balance: profile.balance,
      spend12m: profile.spend12m,
      nextTier: profile.nextTier,
      lots,
      history,
      redemptions,
    };
  }
}
