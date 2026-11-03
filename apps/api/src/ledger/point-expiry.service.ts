import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Ledger } from '@symbion/ledger';
import { CronJob } from 'cron';
import { DataSource, EntityManager } from 'typeorm';

const JOB_NAME = 'point-expiry';
const DEFAULT_CRON = '0 2 * * *';
const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const BATCH_SIZE = 500;

export type ExpiryResult = { members: number; lots: number; points: number };

// Balances ignore expired lots by date; this job records the loss as `expire` entries.
@Injectable()
export class PointExpiryService implements OnModuleInit {
  private readonly logger = new Logger(PointExpiryService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: Ledger<EntityManager>,
    private readonly registry: SchedulerRegistry,
    private readonly config: ConfigService,
  ) {}

  // Registered here, not with @Cron, so POINT_EXPIRY_CRON can change the time.
  onModuleInit(): void {
    const job = CronJob.from({
      cronTime: this.config.get<string>('POINT_EXPIRY_CRON', DEFAULT_CRON),
      onTick: () => this.run(),
      start: true,
      timeZone: TIME_ZONE,
    });
    this.registry.addCronJob(JOB_NAME, job);
  }

  // A failed night is logged and the next one runs; the cron tick must not reject.
  async run(): Promise<void> {
    try {
      const result = await this.expireAll(new Date());
      this.logger.log({ event: 'point-expiry', ...result });
    } catch (error) {
      this.logger.error(
        `point expiry failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async expireAll(now: Date, batchSize = BATCH_SIZE): Promise<ExpiryResult> {
    const total: ExpiryResult = { members: 0, lots: 0, points: 0 };
    let afterId = 0;
    for (;;) {
      const batch: { member_id: string }[] = await this.dataSource.query(
        `SELECT DISTINCT member_id FROM ledger_lots
        WHERE type = 'earn' AND remaining > 0
          AND expires_at IS NOT NULL AND expires_at <= ? AND member_id > ?
        ORDER BY member_id
        LIMIT ?`,
        [now, afterId, batchSize],
      );
      const last = batch[batch.length - 1];
      if (!last) {
        return total;
      }
      for (const { member_id } of batch) {
        const { expired } = await this.expireMember(String(member_id), now);
        if (expired.length > 0) {
          total.members++;
          total.lots += expired.length;
          total.points += expired.reduce((sum, lot) => sum + lot.points, 0);
        }
      }
      afterId = Number(last.member_id);
    }
  }

  // One transaction per member, so locks are short.
  private expireMember(memberId: string, now: Date) {
    return this.dataSource.transaction((tx) =>
      this.ledger.expire(tx, { memberId, now }),
    );
  }
}
