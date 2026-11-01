import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProgramSettings } from '../settings/program-settings.entity';
import { monthPeriod } from './period';

// netVnd > 0: the merchant owes the app. netVnd < 0: the app owes the merchant.
export type MerchantReconciliation = {
  merchantId: number;
  merchantName: string;
  earnedPoints: number;
  earnedVnd: number;
  refundedPoints: number;
  refundedVnd: number;
  redeemedPoints: number;
  redeemedVnd: number;
  breakagePoints: number;
  breakageVnd: number;
  netVnd: number;
};

export type ReconciliationReport = {
  month: string;
  pointValueVnd: number;
  merchants: MerchantReconciliation[];
};

type Row = {
  merchant_id: number;
  merchant_name: string;
  earned_points: string;
  refunded_points: string;
  redeemed_points: string;
  redeemed_vnd: string;
  breakage_points: string;
  breakage_vnd: string;
};

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ProgramSettings)
    private readonly settings: Repository<ProgramSettings>,
  ) {}

  async report(
    month: string,
    now: Date = new Date(),
  ): Promise<ReconciliationReport> {
    const { start, end } = monthPeriod(month);
    const { pointValueVnd } = await this.settings.findOneByOrFail({ id: 1 });
    // A code is not expired before its expiry: this month's report only counts what has passed.
    const expiredBefore = new Date(Math.min(end.getTime(), now.getTime()));

    // Each event counts in the month it happened, so a closed month never changes.
    // The stored status of an expired code stays `issued`; it expires when `expires_at` passes.
    const rows: Row[] = await this.dataSource.query(
      `SELECT m.id AS merchant_id, m.name AS merchant_name,
        SUM(t.earned_points) AS earned_points,
        SUM(t.refunded_points) AS refunded_points,
        SUM(t.redeemed_points) AS redeemed_points,
        SUM(t.redeemed_vnd) AS redeemed_vnd,
        SUM(t.breakage_points) AS breakage_points,
        SUM(t.breakage_vnd) AS breakage_vnd
      FROM merchants m
      JOIN (
        SELECT merchant_id, points AS earned_points,
          0 AS refunded_points, 0 AS redeemed_points, 0 AS redeemed_vnd,
          0 AS breakage_points, 0 AS breakage_vnd
        FROM ledger_lots
        WHERE type = 'earn' AND created_at >= ? AND created_at < ?
        UNION ALL
        SELECT merchant_id, 0, points_deducted, 0, 0, 0, 0
        FROM refunds
        WHERE points_deducted > 0 AND created_at >= ? AND created_at < ?
        UNION ALL
        SELECT merchant_id, 0, 0, points, points * point_value_vnd, 0, 0
        FROM redemptions
        WHERE status = 'used' AND used_at >= ? AND used_at < ?
        UNION ALL
        SELECT merchant_id, 0, 0, 0, 0, points, points * point_value_vnd
        FROM redemptions
        WHERE status = 'issued' AND expires_at >= ? AND expires_at < ?
      ) t ON t.merchant_id = m.id
      GROUP BY m.id, m.name
      ORDER BY m.id`,
      [start, end, start, end, start, end, start, expiredBefore],
    );

    return {
      month,
      pointValueVnd,
      merchants: rows.map((row) => {
        const earnedPoints = Number(row.earned_points);
        const refundedPoints = Number(row.refunded_points);
        // Issued and refunded points have no stored value: they use the current one.
        const earnedVnd = earnedPoints * pointValueVnd;
        const refundedVnd = refundedPoints * pointValueVnd;
        const redeemedVnd = Number(row.redeemed_vnd);
        return {
          merchantId: Number(row.merchant_id),
          merchantName: row.merchant_name,
          earnedPoints,
          earnedVnd,
          refundedPoints,
          refundedVnd,
          redeemedPoints: Number(row.redeemed_points),
          redeemedVnd,
          breakagePoints: Number(row.breakage_points),
          breakageVnd: Number(row.breakage_vnd),
          netVnd: earnedVnd - refundedVnd - redeemedVnd,
        };
      }),
    };
  }
}
