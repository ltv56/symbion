import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EARNING_STRATEGY } from '../earning/earning.strategy';
import { TierEarningStrategy } from '../earning/tier-earning.strategy';
import { LedgerModule } from '../ledger/ledger.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { Order } from './order.entity';
import { MAX_POINTS_PER_ORDER } from './orders.config';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), MerchantsModule, LedgerModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    // 1 point per 10,000 VND at multiplier 1.0 (docs/rules.md).
    { provide: EARNING_STRATEGY, useValue: new TierEarningStrategy(10_000) },
    {
      provide: MAX_POINTS_PER_ORDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        Number(config.get<string>('MAX_POINTS_PER_ORDER', '10000')),
    },
  ],
})
export class OrdersModule {}
