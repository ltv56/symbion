import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LedgerModule } from '../ledger/ledger.module';
import { RedemptionsModule } from '../redemptions/redemptions.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [AuthModule, LedgerModule, RedemptionsModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
