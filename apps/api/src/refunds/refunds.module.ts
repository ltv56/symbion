import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerModule } from '../ledger/ledger.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { Refund } from './refund.entity';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  imports: [TypeOrmModule.forFeature([Refund]), MerchantsModule, LedgerModule],
  controllers: [RefundsController],
  providers: [RefundsService],
})
export class RefundsModule {}
