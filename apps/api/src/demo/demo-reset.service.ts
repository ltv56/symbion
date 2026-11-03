import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DataSource } from 'typeorm';
import { checkDemoApiKey, seedDemo } from '../seed-demo';
import { seedDemoHistory } from '../seed-demo-history';

const JOB_NAME = 'demo-reset';
const DEFAULT_CRON = '0 4 * * *';
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

// Children before parents (FKs). migrations and program_settings stay.
export const WIPED_TABLES = [
  'refunds',
  'redemptions',
  'voucher_favorites',
  'vouchers',
  'orders',
  'ledger_lots',
  'member_otps',
  'member_signups',
  'members',
  'tiers',
  'merchants',
];

// A public demo collects whatever visitors do. This puts the seeded state back every night.
// Deletes every row, so it needs DEMO_RESET=true and DEMO_MODE=true together.
@Injectable()
export class DemoResetService implements OnModuleInit {
  private readonly logger = new Logger(DemoResetService.name);
  private apiKey: string | undefined;
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly registry: SchedulerRegistry,
    private readonly config: ConfigService,
  ) {}

  // Registered here, not with @Cron, so DEMO_RESET_CRON can change the time and the job can be off.
  onModuleInit(): void {
    if (this.config.get<string>('DEMO_RESET') !== 'true') {
      return;
    }
    if (this.config.get<string>('DEMO_MODE') !== 'true') {
      throw new Error(
        'DEMO_RESET=true deletes every row and needs DEMO_MODE=true as well',
      );
    }
    this.apiKey = checkDemoApiKey(this.config.get<string>('DEMO_API_KEY'));
    const job = CronJob.from({
      cronTime: this.config.get<string>('DEMO_RESET_CRON', DEFAULT_CRON),
      onTick: () => this.run(),
      start: true,
      timeZone: TIME_ZONE,
    });
    this.registry.addCronJob(JOB_NAME, job);
  }

  // A failed night is logged and the next one runs; the cron tick must not reject.
  async run(): Promise<void> {
    if (this.running) {
      this.logger.warn('demo reset skipped: the previous run is still going');
      return;
    }
    this.running = true;
    try {
      const result = await this.reset(new Date());
      this.logger.log({ event: 'demo-reset', ...result });
    } catch (error) {
      this.logger.error(
        `demo reset failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }

  // The wipe is one transaction. The seed commits step by step, so a failed seed leaves the demo
  // empty until the next night.
  async reset(now: Date): Promise<{ month: string; steps: number }> {
    const apiKey = this.apiKey;
    if (apiKey === undefined) {
      throw new Error('demo reset is not enabled');
    }
    await this.dataSource.transaction(async (tx) => {
      for (const table of WIPED_TABLES) {
        await tx.query(`DELETE FROM ${table}`);
      }
    });
    await seedDemo(this.dataSource, apiKey);
    return seedDemoHistory(this.dataSource, apiKey, now);
  }
}
