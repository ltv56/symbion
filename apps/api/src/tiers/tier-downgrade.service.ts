import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DataSource } from 'typeorm';
import { evaluateTier } from './evaluate-tier';

const JOB_NAME = 'tier-downgrade';
const DEFAULT_CRON = '0 3 * * *';
const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const BATCH_SIZE = 500;

export type DowngradeResult = { checked: number; downgraded: number };

// Orders only re-evaluate a tier when they arrive, so a member who stops buying keeps the tier
// after the old orders leave the 12-month window. This job catches up every night.
@Injectable()
export class TierDowngradeService implements OnModuleInit {
  private readonly logger = new Logger(TierDowngradeService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly registry: SchedulerRegistry,
    private readonly config: ConfigService,
  ) {}

  // Registered here, not with @Cron, so TIER_DOWNGRADE_CRON can change the time.
  onModuleInit(): void {
    const job = CronJob.from({
      cronTime: this.config.get<string>('TIER_DOWNGRADE_CRON', DEFAULT_CRON),
      onTick: () => this.run(),
      start: true,
      timeZone: TIME_ZONE,
    });
    this.registry.addCronJob(JOB_NAME, job);
  }

  // A failed night is logged and the next one runs; the cron tick must not reject.
  async run(): Promise<void> {
    try {
      const result = await this.downgrade(new Date());
      this.logger.log({ event: 'tier-downgrade', ...result });
    } catch (error) {
      this.logger.error(
        `tier downgrade failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // Members on the lowest tier can't go lower, so they are skipped.
  async downgrade(now: Date, batchSize = BATCH_SIZE): Promise<DowngradeResult> {
    let checked = 0;
    let downgraded = 0;
    let afterId = 0;
    for (;;) {
      const batch: { id: number }[] = await this.dataSource.query(
        `SELECT m.id FROM members m
        JOIN tiers t ON t.id = m.tier_id
        WHERE t.min_spend > 0 AND m.id > ?
        ORDER BY m.id
        LIMIT ?`,
        [afterId, batchSize],
      );
      const last = batch[batch.length - 1];
      if (!last) {
        return { checked, downgraded };
      }
      for (const { id } of batch) {
        if (await this.reevaluate(Number(id), now)) {
          downgraded++;
        }
      }
      checked += batch.length;
      afterId = Number(last.id);
    }
  }

  // One transaction per member, so locks are short.
  private reevaluate(memberId: number, now: Date): Promise<boolean> {
    return this.dataSource.transaction(async (tx) => {
      // The lock orders and refunds take first: a new order can't land between the spend read and the update.
      const [before]: { tier_id: number }[] = await tx.query(
        `SELECT tier_id FROM members WHERE id = ? FOR UPDATE`,
        [memberId],
      );
      if (!before) {
        return false;
      }
      await evaluateTier(tx, memberId, now);
      const [after]: { tier_id: number }[] = await tx.query(
        `SELECT tier_id FROM members WHERE id = ?`,
        [memberId],
      );
      return Number(after?.tier_id) !== Number(before.tier_id);
    });
  }
}
